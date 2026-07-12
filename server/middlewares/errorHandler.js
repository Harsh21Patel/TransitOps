const ApiError = require('../utils/ApiError');

// Catches unmatched routes and forwards a 404 into the error handler below.
const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Single place where every thrown/forwarded error is normalized into a
// consistent JSON shape. Keeps stack traces out of production responses.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code;
  let details = err.details;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field "${err.path}": ${err.value}`;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed';
  }

  // Mongoose duplicate key (e.g. unique registration number, unique email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field
      ? `Duplicate value for field "${field}": "${err.keyValue[field]}" already exists.`
      : 'Duplicate value violates a unique constraint.';
  }

  // JWT errors that weren't already caught explicitly
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
    code = 'TOKEN_EXPIRED';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    details,
  });
};

module.exports = { notFound, errorHandler };
