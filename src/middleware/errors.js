export function notFound(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error);
  const status = error.status || (['SLOT_CONFLICT', 'STAFF_CONFLICT'].includes(error.code) ? 409 : error.code === 'NOT_FOUND' ? 404 : ['VALIDATION_ERROR', 'SLOT_UNAVAILABLE'].includes(error.code) ? 422 : 500);
  res.status(status).json({
    error: error.code || 'INTERNAL_ERROR',
    message: status === 500 ? 'Something went wrong. Please try again.' : error.message
  });
}
