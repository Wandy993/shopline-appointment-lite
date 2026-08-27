const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const BOOKING_SOURCES = new Set(['product', 'direct', 'both']);
const SERVICE_TYPES = new Set(['appointment', 'product', 'in_store', 'onsite', 'consultation', 'class', 'other']);
const BOOKING_MODES = new Set(['slot', 'all_day', 'multi_slot']);
const COMMERCE_MODES = new Set(['standalone_free', 'standalone_paid', 'product_pre_purchase', 'product_post_purchase']);
const ACTIVE_COMMERCE_MODES = new Set(['standalone_free', 'standalone_paid', 'product_pre_purchase', 'product_post_purchase']);
const STAFF_ASSIGNMENT_MODES = new Set(['none', 'any', 'customer_choice', 'fixed']);
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function validTimeZone(value) {
  const timezone = String(value || '').trim();
  if (!timezone) return true;
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date()); return true; } catch { return false; }
}

function text(value, max = 255) { return String(value ?? '').trim().slice(0, max); }

function normalizeWindows(value) {
  return (Array.isArray(value) ? value : []).map(window => ({ start: text(window.start, 5), end: text(window.end, 5) }));
}

function validateWindows(windows, errors, messagePrefix = 'Each time window') {
  for (const window of windows) {
    if (!TIME_PATTERN.test(window.start) || !TIME_PATTERN.test(window.end) || window.start >= window.end) errors.push(`${messagePrefix} needs a valid start before end.`);
  }
}

function legacyBookingSource(body) {
  if (body.sourceType === 'standalone') return 'direct';
  return 'product';
}

function legacyCommerceMode(body, bookingSource) {
  if (COMMERCE_MODES.has(body.commerceMode)) return body.commerceMode;
  if (bookingSource === 'direct' && !String(body.productId || '').trim()) return 'standalone_free';
  return 'product_pre_purchase';
}

export function validateRuleInput(body) {
  const errors = [];
  const requestedBookingSource = BOOKING_SOURCES.has(body.bookingSource) ? body.bookingSource : legacyBookingSource(body);
  const commerceMode = legacyCommerceMode(body, requestedBookingSource);
  const bookingSource = commerceMode === 'product_post_purchase' ? 'direct' : requestedBookingSource;
  const rawServiceType = SERVICE_TYPES.has(body.serviceType) ? body.serviceType : 'appointment';
  const serviceType = rawServiceType === 'product' ? 'appointment' : rawServiceType;
  const bookingMode = BOOKING_MODES.has(body.bookingMode) ? body.bookingMode : 'slot';
  const sourceType = bookingSource === 'direct' ? 'standalone' : 'product';
  const durationRaw = Number(body.duration ?? 60);
  const bufferRaw = Number(body.buffer ?? 0);
  const capacity = Number(body.capacity ?? 1);
  const sessionsRequiredRaw = Number(body.sessionsRequired ?? 3);
  const duration = bookingMode === 'all_day' ? 60 : durationRaw;
  const buffer = bookingMode === 'all_day' ? 0 : bufferRaw;
  const sessionsRequired = bookingMode === 'multi_slot' ? sessionsRequiredRaw : 1;
  const minimumNoticeMinutes = Number(body.minimumNoticeMinutes ?? 0);
  const bookingWindowDays = Number(body.bookingWindowDays ?? 90);
  const timezone = text(body.timezone, 80);
  const usesProductPage = bookingSource === 'product' || bookingSource === 'both';
  const needsProductBinding = usesProductPage || ['standalone_paid', 'product_pre_purchase', 'product_post_purchase'].includes(commerceMode);
  const productId = needsProductBinding ? text(body.productId, 100) : '';
  const productTitle = needsProductBinding ? text(body.productTitle, 255) : '';
  const productVariantId = commerceMode === 'standalone_paid' ? text(body.productVariantId, 100) : '';
  const productVariantTitle = commerceMode === 'standalone_paid' ? text(body.productVariantTitle, 255) : '';
  const productVariantPrice = commerceMode === 'standalone_paid' ? text(body.productVariantPrice, 40) : '';
  const paymentHoldMinutes = commerceMode === 'standalone_paid' ? Number(body.paymentHoldMinutes ?? 15) : 15;
  const serviceTitle = text(body.serviceTitle || body.productTitle, 255);
  const rawStaffAssignment = body.staffAssignment && typeof body.staffAssignment === 'object' ? body.staffAssignment : {};
  const staffAssignmentMode = STAFF_ASSIGNMENT_MODES.has(rawStaffAssignment.mode) ? rawStaffAssignment.mode : 'none';
  const staffIds = [...new Set((Array.isArray(rawStaffAssignment.staffIds) ? rawStaffAssignment.staffIds : []).map(value => text(value, 24)).filter(value => OBJECT_ID_PATTERN.test(value)))];
  if (staffAssignmentMode === 'fixed' && staffIds.length !== 1) errors.push('Fixed staff assignment requires exactly one staff member.');
  if (['any', 'customer_choice'].includes(staffAssignmentMode) && staffIds.length < 1) errors.push('Choose at least one staff member for this assignment mode.');

  if (!serviceTitle) errors.push('Service name is required.');
  if (!validTimeZone(timezone)) errors.push('Choose a valid IANA service time zone.');
  if (needsProductBinding && !productId) errors.push('Product is required for this booking flow.');
  if (needsProductBinding && !productTitle) errors.push('Product title is required for this booking flow.');
  if (commerceMode === 'standalone_paid' && !productVariantId) errors.push('Choose the SHOPLINE variant customers will pay for.');
  if (commerceMode === 'standalone_paid' && (!Number.isInteger(paymentHoldMinutes) || paymentHoldMinutes < 5 || paymentHoldMinutes > 30)) errors.push('Payment hold time must be 5–30 minutes.');
  if (bookingMode !== 'all_day' && (!Number.isInteger(duration) || duration < 5 || duration > 480)) errors.push('Duration must be 5–480 minutes.');
  if (bookingMode !== 'all_day' && (!Number.isInteger(buffer) || buffer < 0 || buffer > 240)) errors.push('Buffer must be 0–240 minutes.');
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) errors.push(bookingMode === 'all_day' ? 'Capacity must be 1–100 bookings per day.' : 'Capacity must be 1–100 bookings per time slot.');
  if (bookingMode === 'multi_slot' && (!Number.isInteger(sessionsRequired) || sessionsRequired < 2 || sessionsRequired > 12)) errors.push('Multi-slot bookings must require 2–12 sessions.');
  if (!Number.isInteger(minimumNoticeMinutes) || minimumNoticeMinutes < 0 || minimumNoticeMinutes > 10080) errors.push('Minimum notice must be 0–10080 minutes.');
  if (!Number.isInteger(bookingWindowDays) || bookingWindowDays < 1 || bookingWindowDays > 365) errors.push('Booking window must be 1–365 days.');

  const weeklyAvailability = Array.isArray(body.weeklyAvailability) ? body.weeklyAvailability.map(day => ({
    weekday: Number(day.weekday), enabled: Boolean(day.enabled), windows: bookingMode === 'all_day' ? [] : normalizeWindows(day.windows)
  })) : [];
  for (const day of weeklyAvailability) {
    if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) errors.push('Invalid weekday.');
    if (bookingMode !== 'all_day' && day.enabled && day.windows.length === 0) errors.push('Every enabled weekday needs at least one time window.');
    if (bookingMode !== 'all_day') validateWindows(day.windows, errors);
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
    windows: bookingMode === 'all_day' ? [] : normalizeWindows(item.windows)
  })).filter(item => item.date);
  for (const exception of availabilityExceptions) {
    if (!DATE_PATTERN.test(exception.date)) errors.push('Each availability exception needs a valid date.');
    if (seenExceptionDates.has(exception.date)) errors.push('Each exception date can only be added once.');
    seenExceptionDates.add(exception.date);
    if (bookingMode !== 'all_day' && !exception.closed && exception.windows.length === 0) errors.push('An open exception needs at least one time window.');
    if (bookingMode !== 'all_day') validateWindows(exception.windows, errors, 'Each exception window');
  }

  if (!weeklyAvailability.some(day => day.enabled) && !availabilityExceptions.some(exception => !exception.closed)) errors.push('Enable at least one weekday or add an open exception.');

  const customQuestions = (Array.isArray(body.customQuestions) ? body.customQuestions : []).slice(0, 5).map(question => ({
    label: text(question.label, 120), required: Boolean(question.required)
  })).filter(question => question.label);

  return { errors: [...new Set(errors)], value: {
    bookingSource, commerceMode, sourceType, serviceType, bookingMode, sessionsRequired, serviceTitle, timezone,
    productId, productTitle,
    productHandle: needsProductBinding ? text(body.productHandle, 255) : '',
    productVariantId, productVariantTitle, productVariantPrice, paymentHoldMinutes,
    serviceDescription: text(body.serviceDescription, 500),
    duration, buffer, capacity, minimumNoticeMinutes, bookingWindowDays,
    dateFrom, dateUntil, weeklyAvailability, availabilityExceptions,
    location: text(body.location, 200), staff: text(body.staff, 200),
    staffAssignment: { mode: staffAssignmentMode, staffIds },
    questionLabel: text(body.questionLabel || 'Anything we should know?', 120), customQuestions,
    enabled: body.enabled !== false
  }};
}

function normalizeOccurrence(item) {
  return { date: text(item?.date, 10), time: text(item?.time, 5) };
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
  if (date && !DATE_PATTERN.test(date)) errors.push('A valid date is required.');
  if (time && !TIME_PATTERN.test(time)) errors.push('A valid time is required.');
  const occurrences = (Array.isArray(body.occurrences) ? body.occurrences : []).slice(0, 12).map(normalizeOccurrence);
  for (const occurrence of occurrences) {
    if (!DATE_PATTERN.test(occurrence.date) || !TIME_PATTERN.test(occurrence.time)) errors.push('Every selected session needs a valid date and time.');
  }
  if (!date && !occurrences.length) errors.push('A valid date is required.');
  return { errors: [...new Set(errors)], value: {
    productId: text(body.productId, 100), ruleId: text(body.ruleId, 24), staffId: text(body.staffId, 24), date, time, occurrences, customer,
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
    staff: text(body.staff, 200),
    staffId: text(body.staffId, 24)
  } };
}


export function validateStaffInput(body) {
  const errors = [];
  const name = text(body.name, 120);
  const email = text(body.email, 254).toLowerCase();
  const phone = text(body.phone, 40);
  const status = body.status === 'inactive' ? 'inactive' : 'active';
  if (!name) errors.push('Staff name is required.');
  if (email && !EMAIL_PATTERN.test(email)) errors.push('Enter a valid staff email address.');

  const presetIds = new Set(['aurora', 'ocean', 'mint', 'peach', 'violet', 'sunset', 'sky', 'rose', 'nova']);
  const requestedAvatar = body.avatar && typeof body.avatar === 'object' ? body.avatar : {};
  const avatarKind = ['preset', 'custom', 'initials'].includes(requestedAvatar.kind) ? requestedAvatar.kind : 'preset';
  let avatarValue = text(requestedAvatar.value, 50000);
  if (avatarKind === 'preset') {
    if (!presetIds.has(avatarValue)) avatarValue = 'aurora';
  } else if (avatarKind === 'custom') {
    if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarValue) || avatarValue.length > 45000) {
      errors.push('Upload a PNG, JPG, or WebP staff avatar under 32 KB after processing.');
      avatarValue = '';
    }
  } else avatarValue = '';
  const avatar = { kind: avatarKind, value: avatarValue };
  const notifications = { emailEnabled: Boolean(email && body.notifications?.emailEnabled === true) };

  const weeklyAvailability = Array.isArray(body.weeklyAvailability) ? body.weeklyAvailability.map(day => ({
    weekday: Number(day.weekday), enabled: Boolean(day.enabled), windows: normalizeWindows(day.windows)
  })) : [];
  for (const day of weeklyAvailability) {
    if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) errors.push('Invalid staff weekday.');
    if (day.enabled && day.windows.length === 0) errors.push('Every enabled staff weekday needs at least one time window.');
    validateWindows(day.windows, errors, 'Each staff time window');
  }

  const seenExceptionDates = new Set();
  const availabilityExceptions = (Array.isArray(body.availabilityExceptions) ? body.availabilityExceptions : []).slice(0, 120).map(item => ({
    date: text(item.date, 10), closed: item.closed !== false, windows: normalizeWindows(item.windows)
  })).filter(item => item.date);
  for (const exception of availabilityExceptions) {
    if (!DATE_PATTERN.test(exception.date)) errors.push('Each staff exception needs a valid date.');
    if (seenExceptionDates.has(exception.date)) errors.push('Each staff exception date can only be added once.');
    seenExceptionDates.add(exception.date);
    if (!exception.closed && exception.windows.length === 0) errors.push('An open staff exception needs at least one time window.');
    validateWindows(exception.windows, errors, 'Each staff exception window');
  }
  if (!weeklyAvailability.some(day => day.enabled) && !availabilityExceptions.some(item => !item.closed)) errors.push('Enable at least one staff workday or add an open exception.');

  return { errors: [...new Set(errors)], value: { name, email, phone, avatar, notifications, status, weeklyAvailability, availabilityExceptions } };
}

export function validateBookingStatus(value) {
  const status = text(value, 20);
  return ['completed', 'no_show'].includes(status) ? { errors: [], value: { status } } : { errors: ['Choose completed or no-show.'], value: { status } };
}
