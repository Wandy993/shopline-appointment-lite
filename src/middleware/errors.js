export function notFound(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' });
}

function mongooseValidationMessage(error) {
  const messages = Object.values(error?.errors || {}).map(item => String(item?.message || '').trim()).filter(Boolean);
  return messages.length ? messages.join(' ') : 'Please check the service configuration and try again.';
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error);
  const mongooseValidation = error?.name === 'ValidationError';
  const status = error.status || (mongooseValidation ? 422 : ['SLOT_CONFLICT', 'STAFF_CONFLICT'].includes(error.code) ? 409 : error.code === 'NOT_FOUND' ? 404 : ['VALIDATION_ERROR', 'SLOT_UNAVAILABLE'].includes(error.code) ? 422 : 500);
  res.status(status).json({
    error: mongooseValidation ? 'VALIDATION_ERROR' : (error.code || 'INTERNAL_ERROR'),
    message: mongooseValidation ? mongooseValidationMessage(error) : (status === 500 ? 'Something went wrong. Please try again.' : error.message)
  });
}
