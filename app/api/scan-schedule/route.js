import Anthropic from '@anthropic-ai/sdk';
import { DAYS } from '@/lib/time';

// Uses the Anthropic API (billed separately from a claude.ai subscription) to read a
// photo of a class schedule and turn it into structured rows. Requires ANTHROPIC_API_KEY
// to be set in the environment (see README for local + Vercel setup).

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const SCHEDULE_TOOL = {
  name: 'record_schedule',
  description: 'Records the weekly class schedule read from the photo.',
  input_schema: {
    type: 'object',
    properties: {
      classes: {
        type: 'array',
        description: 'Every class/session visible in the photo, one entry per row.',
        items: {
          type: 'object',
          properties: {
            day: { type: 'string', enum: DAYS, description: 'Day of the week the class meets on.' },
            start: {
              type: 'string',
              pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
              description: '24-hour start time, e.g. "09:00" or "14:30".',
            },
            end: {
              type: 'string',
              pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
              description: '24-hour end time, e.g. "10:30".',
            },
            label: { type: 'string', description: 'Subject / class name, kept short.' },
            approx: {
              type: 'boolean',
              description: 'true if the time was hard to read and you had to estimate it.',
            },
          },
          required: ['day', 'start', 'end', 'label', 'approx'],
        },
      },
    },
    required: ['classes'],
  },
};

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          'ANTHROPIC_API_KEY is not set on the server. Add it to .env.local for local dev, and to your Vercel project\'s Environment Variables for production, then redeploy.',
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const dataUrl = body?.dataUrl;
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) {
    return Response.json({ error: 'No valid image was provided.' }, { status: 400 });
  }
  const [, mediaType, base64Data] = match;

  const client = new Anthropic({ apiKey });

  let message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      tool_choice: { type: 'tool', name: 'record_schedule' },
      tools: [SCHEDULE_TOOL],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            {
              type: 'text',
              text: 'This is a photo of someone\'s weekly class schedule (a printed card, a screenshot of a calendar app, a handwritten list, etc). Read every class session you can find and call record_schedule with one entry per session. Use 24-hour "HH:MM" times. If a time is blurry, cut off, or ambiguous, do your best estimate and mark that entry approx:true. Skip anything that clearly is not a class/session (e.g. plain grid lines with no text).',
            },
          ],
        },
      ],
    });
  } catch (err) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 502;
    return Response.json(
      { error: `Claude API request failed: ${err?.message || 'unknown error'}` },
      { status }
    );
  }

  const toolUse = message.content.find((b) => b.type === 'tool_use' && b.name === 'record_schedule');
  const classes = Array.isArray(toolUse?.input?.classes) ? toolUse.input.classes : [];

  const cleaned = classes.filter(
    (c) => DAYS.includes(c.day) && /^\d{2}:\d{2}$/.test(c.start) && /^\d{2}:\d{2}$/.test(c.end) && c.label
  );

  return Response.json({ classes: cleaned });
}
