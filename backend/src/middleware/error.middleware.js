const notFound = (req, res, next) => {
  res.status(404).json({ message: `Not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Server error';
  const route = `${req.method || 'UNKNOWN'} ${req.originalUrl || req.url || ''}`.trim();

  if (err.name === 'MulterError') {
    console.error(`[upload] ${route} -> 400: ${message}`);
    return res.status(400).json({ message: `Upload error: ${message}` });
  }

  if (status >= 500) {
    console.error(`[error] ${route} -> ${status}: ${message}`);
    if (err.stack) console.error(err.stack);
  }

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };