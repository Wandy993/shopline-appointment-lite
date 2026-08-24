const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(value, max = 255) { return String(value ?? '').trim().slice(0, max); }

export function validateRuleInput(body) {
  const errors = [];
  const duration = Number(body.duration);
  const buffer = Number(body.buffer ?? 0);
  const productId = text(body.productId, 100);
  const productTitle = text(body.productTitle, 255);
  if (!productId) errors.push('Product is required.');
  if (!productTitle) errors.push('Product title is required.');
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) errors.push('Duration must be 5–480 minutes.');
  if (!Number.isInteger(buffer) || buffer < 0 || buffer > 240) errors.push('Buffer must be 0–240 minutes.');

  const weeklyAvailability = Array.isArray(body.weeklyAvailability) ? body.weeklyAvailability.map(day => ({
    weekday: Number(day.weekday),
    enabled: Boolean(day.enabled),
    windows: Array.isArray(day.windows) ? day.windows.map(window => ({ start: text(window.start, 5), end: text(window.end, 5) })) : []
  })) : [];
  for (const day of weeklyAvailability) {
    if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) errors.push('Invalid weekday.');
    if (day.enabled && day.windows.length === 0) errors.push('Every enabled weekday needs at least one time window.');
    for (const window of day.windows) {
      if (!TIME_PATTERN.test(window.start) || !TIME_PATTERN.test(window.end) || window.start >= window.end) errors.push('Each time window needs a valid start before end.');
    }
  }
  if (!weeklyAvailability.some(day => day.enabled)) errors.push('Enable at least one weekday.');

  const dateFrom = text(body.dateFrom, 10);
  const dateUntil = text(body.dateUntil, 10);
  if (dateFrom && !DATE_PATTERN.test(dateFrom)) errors.push('Invalid start date.');
  if (dateUntil && !DATE_PATTERN.test(dateUntil)) errors.push('Invalid end date.');
  if (dateFrom && dateUntil && dateFrom > dateUntil) errors.push('Start date must be before end date.');

  const customQuestions = (Array.isArray(body.customQuestions) ? body.customQuestions : []).slice(0, 5).map(question => ({
    label: text(question.label, 120), required: Boolean(question.required)
  })).filter(question => question.label);

  return { errors: [...new Set(errors)], value: {
    productId, productTitle, productHandle: text(body.productHandle, 255), duration, buffer,
    dateFrom, dateUntil, weeklyAvailability, location: text(body.location, 200), staff: text(body.staff, 200),
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
    productId: text(body.productId, 100), date, time, customer,
    note: text(body.note, 2000),
    answers: (Array.isArray(body.answers) ? body.answers : []).slice(0, 5).map(answer => ({
      question: text(answer.question, 120), answer: text(answer.answer, 1000)
    }))
  }};
}
