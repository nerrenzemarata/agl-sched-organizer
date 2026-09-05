// Initial data, ported from the original static schedule.
// `schedulePhoto` is the source photo/screenshot a class list was transcribed from
// (live in /public/members) — it's a reference document, not a profile picture.
// Everything here is only the *seed* — once the app runs, all edits are saved to localStorage.
export const SEED_MEMBERS = [
  { id: 'alec', name: 'Alec', color: '#6366F1', exact: true, schedulePhoto: '/members/alec.jpg' },
  { id: 'carl', name: 'Carl John Monteros', color: '#DB8B0B', exact: false, schedulePhoto: '/members/carl.jpg' },
  { id: 'dominic', name: 'Dominic', color: '#E0398A', exact: true, schedulePhoto: '/members/dominic.jpg' },
  { id: 'jeremy', name: 'Jeremy Silao', color: '#0F9E8E', exact: true, schedulePhoto: '/members/jeremy.jpg' },
  { id: 'jhury', name: 'Jhury Louie', color: '#8347E8', exact: false, schedulePhoto: '/members/jhury.jpg' },
  { id: 'john', name: 'John Andrie', color: '#0B8FCC', exact: true, schedulePhoto: '/members/john.jpg' },
];

// start,end in "HH:MM" 24h. approx:true => low-confidence read from a calendar screenshot.
export const SEED_EVENTS = {
  alec: {
    Mon: [
      { start: '09:00', end: '11:00', label: 'PATHFIT' },
      { start: '13:00', end: '19:00', label: 'Food Micro Lab' },
      { start: '14:30', end: '16:00', label: 'MMW' },
    ],
    Tue: [
      { start: '10:00', end: '12:00', label: 'Quant Chem' },
      { start: '13:30', end: '16:00', label: 'Calc' },
      { start: '16:00', end: '17:30', label: 'Art App' },
    ],
    Wed: [
      { start: '13:30', end: '15:00', label: 'Bas Nutri' },
      { start: '16:00', end: '17:30', label: 'Food Micro' },
    ],
    Thu: [
      { start: '10:00', end: '13:00', label: 'Quant Chem' },
      { start: '14:30', end: '16:00', label: 'MMW' },
      { start: '16:00', end: '17:30', label: 'Bas Nutri' },
    ],
    Fri: [
      { start: '08:30', end: '10:00', label: 'Food Micro' },
      { start: '13:30', end: '16:00', label: 'Envisci' },
      { start: '16:00', end: '17:30', label: 'Art App' },
    ],
    Sat: [],
    Sun: [],
  },
  carl: {
    Mon: [
      { start: '07:00', end: '08:20', label: 'Rizal – Life & Works', approx: true },
      { start: '13:00', end: '15:30', label: 'SC221 Special Courses', approx: true },
    ],
    Tue: [],
    Wed: [
      { start: '13:00', end: '16:00', label: 'CpE221 Data Struct & Algo', approx: true },
      { start: '16:00', end: '17:00', label: 'CpE213 Operating Sys', approx: true },
    ],
    Thu: [
      { start: '09:00', end: '10:00', label: 'PATHFIT 3', approx: true },
      { start: '16:00', end: '18:00', label: 'Math111a Calculus 1', approx: true },
    ],
    Fri: [
      { start: '10:00', end: '13:00', label: 'CpE221 Data Struct & Algo', approx: true },
      { start: '16:00', end: '17:30', label: 'SC221 Eng’g Economics', approx: true },
    ],
    Sat: [{ start: '16:00', end: '17:00', label: 'CpE213 Operating Sys', approx: true }],
    Sun: [],
  },
  dominic: {
    Mon: [
      { start: '07:00', end: '09:30', label: 'Seminar' },
      { start: '10:00', end: '13:00', label: 'Elec Mach' },
      { start: '13:00', end: '16:00', label: 'Research' },
      { start: '16:00', end: '19:00', label: 'PSA 1' },
    ],
    Tue: [
      { start: '08:00', end: '09:30', label: 'Logics' },
      { start: '13:00', end: '14:00', label: 'Ele Com' },
      { start: '19:00', end: '21:00', label: 'Feedback' },
    ],
    Wed: [
      { start: '08:00', end: '09:00', label: 'Ele Com' },
      { start: '13:30', end: '15:30', label: 'Elec Mach' },
      { start: '16:00', end: '18:30', label: 'Logics' },
    ],
    Thu: [
      { start: '10:00', end: '13:00', label: 'Industrial' },
      { start: '13:00', end: '16:00', label: 'Enhancement 2' },
    ],
    Fri: [
      { start: '09:00', end: '11:00', label: 'Industrial' },
      { start: '13:00', end: '16:00', label: 'PSA 1' },
    ],
    Sat: [],
    Sun: [],
  },
  jeremy: {
    Mon: [
      { start: '10:00', end: '13:00', label: 'IT131 Web Sys & Tech' },
      { start: '13:00', end: '15:00', label: 'IT130 Networking 2' },
    ],
    Tue: [
      { start: '07:00', end: '09:00', label: 'IT128 SysAdmin & Maint' },
      { start: '17:00', end: '19:00', label: 'IT129 InfoSec 2' },
    ],
    Wed: [
      { start: '09:00', end: '11:00', label: 'IT131 Web Sys & Tech' },
      { start: '13:00', end: '16:00', label: 'IT130 Networking 2' },
    ],
    Thu: [{ start: '10:00', end: '13:00', label: 'IT128 SysAdmin & Maint' }],
    Fri: [{ start: '13:00', end: '16:00', label: 'IT132 Capstone 2' }],
    Sat: [{ start: '07:00', end: '10:00', label: 'IT129 InfoSec 2' }],
    Sun: [],
  },
  jhury: {
    Mon: [
      { start: '07:00', end: '09:00', label: 'EE314 Elec Machines', approx: true },
      { start: '13:00', end: '16:00', label: 'EECSE331 Enhancement 2', approx: true },
      { start: '16:00', end: '19:00', label: 'ECE301 Logic Circuits', approx: true },
    ],
    Tue: [
      { start: '07:00', end: '09:00', label: 'EE417 Seminars/Colloq', approx: true },
      { start: '09:00', end: '13:00', label: 'EE326 Power Sys Analysis 1', approx: true },
      { start: '15:00', end: '16:00', label: 'ECE303 Fundamentals', approx: true },
    ],
    Wed: [
      { start: '10:00', end: '11:00', label: 'ECE303 Fundamentals', approx: true },
      { start: '16:00', end: '18:00', label: 'EE314 Elec Machines 1', approx: true },
    ],
    Thu: [
      { start: '13:00', end: '16:00', label: 'EE311 Research Methods', approx: true },
      { start: '16:00', end: '19:00', label: 'ECE301 Logic Circuits', approx: true },
      { start: '19:00', end: '21:00', label: 'EE225 Feedback Control', approx: true },
    ],
    Fri: [{ start: '16:00', end: '19:00', label: 'EE326 Power Sys Analysis 1', approx: true }],
    Sat: [{ start: '09:00', end: '16:00', label: 'ECE202 Industrial Electronics', approx: true }],
    Sun: [],
  },
  john: {
    Mon: [
      { start: '10:00', end: '13:00', label: 'Theory of Errors' },
      { start: '16:00', end: '17:30', label: 'Laws' },
    ],
    Tue: [
      { start: '08:30', end: '10:00', label: 'ArtApp' },
      { start: '19:00', end: '20:30', label: 'EngMech' },
    ],
    Wed: [
      { start: '11:00', end: '13:00', label: 'EngSur' },
      { start: '17:30', end: '19:00', label: 'LITE' },
      { start: '19:00', end: '20:30', label: 'EngMech' },
    ],
    Thu: [
      { start: '07:00', end: '13:00', label: 'EngSur (Field)' },
      { start: '16:00', end: '17:30', label: 'Laws' },
      { start: '19:30', end: '21:00', label: 'EDA' },
    ],
    Fri: [
      { start: '08:30', end: '10:00', label: 'ArtApp' },
      { start: '13:00', end: '15:00', label: 'PathFit' },
      { start: '16:00', end: '17:00', label: 'Safety Manage' },
      { start: '17:30', end: '19:00', label: 'LITE' },
    ],
    Sat: [
      { start: '13:00', end: '16:00', label: 'DE' },
      { start: '16:00', end: '17:30', label: 'EDA' },
    ],
    Sun: [],
  },
};
