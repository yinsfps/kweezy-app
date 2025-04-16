import { validationResult } from 'express-validator';

// Middleware to handle validation errors from express-validator
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log errors for debugging (optional)
    // console.warn('Validation Errors:', errors.array());
    // Return a 400 Bad Request with the first error message
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  // No validation errors, proceed to the next middleware/handler
  next();
};
