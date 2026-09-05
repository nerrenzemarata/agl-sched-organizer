// Fixed, curated hues that read well as white-text chips in both light and dark themes.
export const PALETTE = [
  '#6366F1', // indigo
  '#DB8B0B', // amber
  '#E0398A', // pink
  '#0F9E8E', // teal
  '#8347E8', // purple
  '#0B8FCC', // blue
  '#C23B3B', // crimson
  '#7C8C1E', // olive
  '#8C5A2B', // brown
  '#5B6B7A', // slate
  '#B23AA0', // magenta
  '#1AA6B7', // cyan
  '#E0653A', // coral
  '#2E7D4F', // forest
];

export function colorForIndex(index) {
  if (index < PALETTE.length) return PALETTE[index];
  // Beyond the curated set, spread hues around the wheel deterministically.
  const hue = (index * 47) % 360;
  return `hsl(${hue}, 62%, 45%)`;
}

export function nextColor(existingMembers) {
  return colorForIndex(existingMembers.length);
}
