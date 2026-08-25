const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function bookingModeFor(rule = {}) {
  return ['slot', 'all_day', 'multi_slot'].includes(rule.bookingMode) ? rule.bookingMode : 'slot';
}

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
  if (!DATE_PATTERN.test(date)) return NaN;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return NaN;
  return parsed.getUTCDay();
}

export function addDays(date, days) {
  if (!Number.isInteger(weekdayForDate(date))) return '';
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + Number(days || 0));
  return parsed.toISOString().slice(0, 10);
}

function dateTimeMinuteValue(date, time) {
  if (!Number.isInteger(weekdayForDate(date)) || !TIME_PATTERN.test(time)) return NaN;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute) / 60000);
}

function exceptionForDate(rule, date) {
  return (rule.availabilityExceptions || []).find(item => item.date === date) || null;
}

function baseDateAllowed(rule, date) {
  const weekday = weekdayForDate(date);
  if (!Number.isInteger(weekday)) return false;
  if (rule.dateFrom && date < rule.dateFrom) return false;
  if (rule.dateUntil && date > rule.dateUntil) return false;
  const exception = exceptionForDate(rule, date);
  if (exception) return !exception.closed;
  return Boolean(rule.weeklyAvailability?.find(day => day.weekday === weekday && day.enabled));
}

export function windowsForDate(rule, date) {
  const weekday = weekdayForDate(date);
  if (!Number.isInteger(weekday)) return [];
  if (rule.dateFrom && date < rule.dateFrom) return [];
  if (rule.dateUntil && date > rule.dateUntil) return [];

  const exception = exceptionForDate(rule, date);
  if (exception) return exception.closed ? [] : (exception.windows || []);

  const schedule = rule.weeklyAvailability?.find(day => day.weekday === weekday && day.enabled);
  return schedule?.windows || [];
}

export function isDateAllowed(rule, date) {
  if (bookingModeFor(rule) === 'all_day') return baseDateAllowed(rule, date);
  return windowsForDate(rule, date).length > 0;
}

export function slotsForDate(rule, date) {
  if (bookingModeFor(rule) === 'all_day') return [];
  const windows = windowsForDate(rule, date);
  if (!windows.length) return [];
  const duration = Number(rule.duration);
  const buffer = Number(rule.buffer || 0);
  const step = duration + buffer;
  if (!Number.isFinite(step) || step <= 0) return [];
  const slots = [];
  for (const window of windows) {
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

export function allDaySlotKey(date) {
  return `${date}#ALL_DAY`;
}

export function occurrenceSlotKey(mode, date, time = '') {
  return mode === 'all_day' ? allDaySlotKey(date) : slotKey(date, time);
}

export function zonedNow(timezone = 'UTC', now = new Date()) {
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
  }
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function isFutureSlot(date, time, timezone = 'UTC', now = new Date()) {
  if (!Number.isInteger(weekdayForDate(date)) || !TIME_PATTERN.test(time)) return false;
  const current = zonedNow(timezone, now);
  return slotKey(date, time) > slotKey(current.date, current.time);
}

export function isWithinSchedulingPolicy(rule, date, time, timezone = 'UTC', now = new Date()) {
  if (!isFutureSlot(date, time, timezone, now)) return false;
  const current = zonedNow(timezone, now);
  const bookingWindowDays = Number.isInteger(Number(rule.bookingWindowDays)) ? Number(rule.bookingWindowDays) : 90;
  if (date > addDays(current.date, Math.max(1, bookingWindowDays))) return false;
  const minimumNoticeMinutes = Math.max(0, Number(rule.minimumNoticeMinutes || 0));
  const slotMinute = dateTimeMinuteValue(date, time);
  const nowMinute = dateTimeMinuteValue(current.date, current.time);
  return Number.isFinite(slotMinute) && Number.isFinite(nowMinute) && slotMinute - nowMinute >= minimumNoticeMinutes;
}

export function isAllDayBookableDate(rule, date, timezone = 'UTC', now = new Date()) {
  if (!baseDateAllowed(rule, date)) return false;
  const current = zonedNow(timezone, now);
  if (date < current.date) return false;
  const bookingWindowDays = Math.max(1, Number(rule.bookingWindowDays || 90));
  if (date > addDays(current.date, bookingWindowDays)) return false;
  const noticeDays = Math.ceil(Math.max(0, Number(rule.minimumNoticeMinutes || 0)) / 1440);
  return date >= addDays(current.date, noticeDays);
}

export function futureSlotsForDate(rule, date, timezone = 'UTC', now = new Date()) {
  return slotsForDate(rule, date).filter(time => isWithinSchedulingPolicy(rule, date, time, timezone, now));
}

export function filterSlotsByCapacity(slots, bookingTimes = [], capacity = 1) {
  const limit = Math.max(1, Number(capacity || 1));
  const counts = bookingTimes.reduce((map, value) => {
    const time = typeof value === 'string' ? value : value?.time;
    if (time) map.set(time, (map.get(time) || 0) + 1);
    return map;
  }, new Map());
  return slots.filter(time => (counts.get(time) || 0) < limit);
}
