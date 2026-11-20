function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format for field "${err.path}".`;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyPattern || {})[0] || 'record';
    message = `A record with this ${duplicateField} already exists.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join('; ');
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR ${statusCode}]`, err.message);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
