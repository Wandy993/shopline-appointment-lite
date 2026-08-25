const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const SOURCE_TYPES = new Set(['product', 'standalone']);
const SERVICE_TYPES = new Set(['product', 'in_store', 'onsite', 'consultation', 'class', 'other']);

function text(value, max = 255) { return String(value ?? '').trim().slice(0, max); }

function normalizeWindows(value) {
  return (Array.isArray(value) ? value : []).map(window => ({ start: text(window.start, 5), end: text(window.end, 5) }));
}

function validateWindows(windows, errors, messagePrefix = 'Each time window') {
  for (const window of windows) {
    if (!TIME_PATTERN.test(window.start) || !TIME_PATTERN.test(window.end) || window.start >= window.end) errors.push(`${messagePrefix} needs a valid start before end.`);
  }
}

export function validateRuleInput(body) {
  const errors = [];
  const sourceType = SOURCE_TYPES.has(body.sourceType) ? body.sourceType : (body.serviceType && body.serviceType !== 'product' ? 'standalone' : 'product');
  const serviceType = SERVICE_TYPES.has(body.serviceType) ? body.serviceType : (sourceType === 'product' ? 'product' : 'other');
  const duration = Number(body.duration);
  const buffer = Number(body.buffer ?? 0);
  const capacity = Number(body.capacity ?? 1);
  const minimumNoticeMinutes = Number(body.minimumNoticeMinutes ?? 0);
  const bookingWindowDays = Number(body.bookingWindowDays ?? 90);
  const productId = sourceType === 'product' ? text(body.productId, 100) : '';
  const productTitle = text(body.serviceTitle || body.productTitle, 255);

  if (sourceType === 'product' && !productId) errors.push('Product is required.');
  if (!productTitle) errors.push(sourceType === 'product' ? 'Product title is required.' : 'Service name is required.');
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) errors.push('Duration must be 5–480 minutes.');
  if (!Number.isInteger(buffer) || buffer < 0 || buffer > 240) errors.push('Buffer must be 0–240 minutes.');
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) errors.push('Capacity must be 1–100 bookings per time slot.');
  if (!Number.isInteger(minimumNoticeMinutes) || minimumNoticeMinutes < 0 || minimumNoticeMinutes > 10080) errors.push('Minimum notice must be 0–10080 minutes.');
  if (!Number.isInteger(bookingWindowDays) || bookingWindowDays < 1 || bookingWindowDays > 365) errors.push('Booking window must be 1–365 days.');

  const weeklyAvailability = Array.isArray(body.weeklyAvailability) ? body.weeklyAvailability.map(day => ({
    weekday: Number(day.weekday), enabled: Boolean(day.enabled), windows: normalizeWindows(day.windows)
  })) : [];
  for (const day of weeklyAvailability) {
    if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) errors.push('Invalid weekday.');
    if (day.enabled && day.windows.length === 0) errors.push('Every enabled weekday needs at least one time window.');
    validateWindows(day.windows, errors);
  }
  const dateFrom = text(body.dateFrom, 10);
  const dateUntil = text(body.dateUntil, 10);
  if (dateFrom && !DATE_PATTERN.test(dateFrom)) errors.push('Invalid start date.');
  if (dateUntil && !DATE_PATTERN.test(dateUntil)) errors.push('Invalid end date.');
  if (dateFrom && dateUntil && dateFrom > dateUntil) errors.push('Start date must be before end date.');

  const seenExceptionDates = new Set();
  const availabilityExceptions = (Array.isArray(body.availabilityExceptions) ? body.availabilityExceptions : []).slice(0, 120).map(item => ({
    date: text(item.date, 10),
    closed: item.closed !== false,
    windows: normalizeWindows(item.windows)
  })).filter(item => item.date);
  for (const exception of availabilityExceptions) {
    if (!DATE_PATTERN.test(exception.date)) errors.push('Each availability exception needs a valid date.');
    if (seenExceptionDates.has(exception.date)) errors.push('Each exception date can only be added once.');
    seenExceptionDates.add(exception.date);
    if (!exception.closed && exception.windows.length === 0) errors.push('An open exception needs at least one time window.');
    validateWindows(exception.windows, errors, 'Each exception window');
  }

  if (!weeklyAvailability.some(day => day.enabled) && !availabilityExceptions.some(exception => !exception.closed && exception.windows.length)) errors.push('Enable at least one weekday or add an open exception.');

  const customQuestions = (Array.isArray(body.customQuestions) ? body.customQuestions : []).slice(0, 5).map(question => ({
    label: text(question.label, 120), required: Boolean(question.required)
  })).filter(question => question.label);

  return { errors: [...new Set(errors)], value: {
    sourceType, serviceType, productId, productTitle,
    productHandle: sourceType === 'product' ? text(body.productHandle, 255) : '',
    serviceDescription: text(body.serviceDescription, 500),
    duration, buffer, capacity, minimumNoticeMinutes, bookingWindowDays,
    dateFrom, dateUntil, weeklyAvailability, availabilityExceptions,
    location: text(body.location, 200), staff: text(body.staff, 200),
    questionLabel: text(body.questionLabel || 'Anything we should know?', 120), customQuestions,
    enabled: body.enabled !== false
  }};
}

export function validateBookingInput(body) {
  const errors = [];
  const customer = {
    name: text(body.customer?.name, 120),
    email: text(body.customer?.email, 254).toLowerCase(),
    phone: text(body.customer?.phone, 40)
  };
  if (!customer.name) errors.push('Name is required.');
  if (!EMAIL_PATTERN.test(customer.email)) errors.push('A valid email is required.');
  const date = text(body.date, 10);
  const time = text(body.time, 5);
  if (!DATE_PATTERN.test(date)) errors.push('A valid date is required.');
  if (!TIME_PATTERN.test(time)) errors.push('A valid time is required.');
  return { errors, value: {
    productId: text(body.productId, 100), ruleId: text(body.ruleId, 24), date, time, customer,
    note: text(body.note, 2000),
    answers: (Array.isArray(body.answers) ? body.answers : []).slice(0, 5).map(answer => ({
      question: text(answer.question, 120), answer: text(answer.answer, 1000)
    }))
  }};
}

export function validateSlotInput(body) {
  const errors = [];
  const date = text(body.date, 10);
  const time = text(body.time, 5);
  if (!DATE_PATTERN.test(date)) errors.push('A valid date is required.');
  if (!TIME_PATTERN.test(time)) errors.push('A valid time is required.');
  return { errors, value: { date, time } };
}

export function validateDateInput(body) {
  const date = text(body.date, 10);
  return { errors: DATE_PATTERN.test(date) ? [] : ['A valid date is required.'], value: { date } };
}

export function validateAdminBookingInput(body) {
  const { errors, value } = validateSlotInput(body);
  return { errors, value: {
    ...value,
    location: text(body.location, 200),
    staff: text(body.staff, 200)
  } };
}

export function validateBookingStatus(value) {
  const status = text(value, 20);
  return ['completed', 'no_show'].includes(status) ? { errors: [], value: { status } } : { errors: ['Choose completed or no-show.'], value: { status } };
}
