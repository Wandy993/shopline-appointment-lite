export function wallTimeToInstant(date, time, timezone = 'UTC') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''))) return null;
  const [year, month, day] = date.split('-').map(Number); const [hour, minute] = time.split(':').map(Number);
  let instant = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const partsFor = (value, zone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(value).map(part => [part.type, part.value]));
  try {
    for (let i = 0; i < 3; i += 1) {
      const seen = partsFor(instant, timezone || 'UTC'); const wanted = Date.UTC(year, month - 1, day, hour, minute);
      const observed = Date.UTC(Number(seen.year), Number(seen.month) - 1, Number(seen.day), Number(seen.hour), Number(seen.minute));
      const delta = wanted - observed; if (!delta) break; instant = new Date(instant.getTime() + delta);
    }
  } catch { return timezone === 'UTC' ? null : wallTimeToInstant(date, time, 'UTC'); }
  return instant;
}

export function reminderOccurrences(booking = {}) {
  const mode = booking.bookingMode || 'slot';
  if (mode === 'multi_slot' && Array.isArray(booking.occurrences) && booking.occurrences.length) return booking.occurrences.map(item => ({ date:item.date, time:item.time || '00:00', occurrenceKey:item.slotKey || `${item.date}T${item.time || '00:00'}` }));
  const time = mode === 'all_day' ? '09:00' : (booking.time || '00:00');
  return [{ date:booking.date, time, occurrenceKey:booking.slotKey || (mode === 'all_day' ? `${booking.date}#ALL_DAY` : `${booking.date}T${time}`) }];
}

export function reminderIsDue(start, leadHours, now = new Date(), graceMs = 12 * 60 * 60 * 1000) {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return false;
  const nowMs = new Date(now).getTime(); const startMs = start.getTime(); const targetMs = startMs - Number(leadHours || 24) * 3600000;
  return startMs > nowMs && nowMs >= targetMs && nowMs - targetMs <= graceMs;
}
