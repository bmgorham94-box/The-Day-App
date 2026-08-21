// The Day — .ics export. 7 days of blocks with 10-min alarms so iOS Calendar
// becomes the notification layer. Floating local time (fires on the wall clock).
import { buildDay, parseISO, isoDate } from './engine.js';

// Which block kinds become calendar alarms.
const ALARMED = new Set(['meal', 'row', 'lift', 'meeting', 'engine']);
// Default durations (minutes) when a block has no explicit end.
const DUR = { meal: 15, row: 40, lift: 60, meeting: 60, prep: 60, engine: 25 };

function pad(n) { return String(n).padStart(2, '0'); }
function icsLocal(iso, mins) {
  const d = parseISO(iso);
  const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, da = d.getUTCDate();
  const hh = Math.floor(mins / 60), mm = mins % 60;
  return `${y}${pad(mo)}${pad(da)}T${pad(hh)}${pad(mm)}00`;
}
function esc(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
// Deterministic UID (no Date.now — keeps re-exports stable).
function uid(iso, id) { return `theday-${iso}-${id}@the-day.local`; }

// Add whole days to an ISO string.
function addDays(iso, n) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
}

export function buildICS(startISO, days = 7) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Day//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:The Day',
  ];

  for (let i = 0; i < days; i++) {
    const iso = addDays(startISO, i);
    const blocks = buildDay(iso);
    for (const b of blocks) {
      if (!ALARMED.has(b.kind)) continue;
      const start = b.start;
      const end = b.end != null ? b.end : start + (DUR[b.kind] || 15);
      const summary = b.kind === 'meal'
        ? `🍽 ${b.title}${b.p != null ? ` · ${b.p}P ${b.kcal}kcal` : ''}`
        : b.kind === 'lift' ? `🏋 ${b.title}`
        : b.kind === 'row' || b.kind === 'engine' ? `🚣 ${b.title}`
        : `📅 ${b.title}`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid(iso, b.id)}`,
        `DTSTAMP:${icsLocal(startISO, 0)}`,
        `DTSTART:${icsLocal(iso, start)}`,
        `DTEND:${icsLocal(iso, end)}`,
        `SUMMARY:${esc(summary)}`,
      );
      if (b.sub) lines.push(`DESCRIPTION:${esc(b.sub)}`);
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(b.title)}`,
        'TRIGGER:-PT10M',
        'END:VALARM',
        'END:VEVENT',
      );
    }
  }

  lines.push('END:VCALENDAR');
  // ICS requires CRLF line endings.
  return lines.join('\r\n');
}

// Browser download helper.
export function downloadICS(startISO) {
  const text = buildICS(startISO);
  const blob = new Blob([text], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `the-day-${startISO}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default { buildICS, downloadICS };
