const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function minutesFromTime(time) {
  if (!TIME_PATTERN.test(time)) return NaN;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function timeFromMinutes(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function weekdayForDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return NaN;
  return parsed.getUTCDay();
}

export function isDateAllowed(rule, date) {
  const weekday = weekdayForDate(date);
  if (!Number.isInteger(weekday)) return false;
  if (rule.dateFrom && date < rule.dateFrom) return false;
  if (rule.dateUntil && date > rule.dateUntil) return false;
  return Boolean(rule.weeklyAvailability?.find(day => day.weekday === weekday && day.enabled));
}

export function slotsForDate(rule, date) {
  if (!isDateAllowed(rule, date)) return [];
  const weekday = weekdayForDate(date);
  const schedule = rule.weeklyAvailability.find(day => day.weekday === weekday);
  const duration = Number(rule.duration);
  const buffer = Number(rule.buffer || 0);
  const step = duration + buffer;
  if (!Number.isFinite(step) || step <= 0) return [];
  const slots = [];
  for (const window of schedule.windows || []) {
    const start = minutesFromTime(window.start);
    const end = minutesFromTime(window.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    for (let cursor = start; cursor + duration <= end; cursor += step) slots.push(timeFromMinutes(cursor));
  }
  return [...new Set(slots)].sort();
}

export function slotKey(date, time) {
  return `${date}T${time}`;
}
