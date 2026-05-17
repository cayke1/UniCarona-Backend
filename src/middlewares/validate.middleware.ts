import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

function formatIssues(error: z.ZodError) {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

export const validateData = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: true,
        message: 'Invalid input data.',
        fields: formatIssues(result.error)
      });
    }

    return next();
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        error: true,
        message: 'Invalid query parameters.',
        fields: formatIssues(result.error)
      });
    }

    return next();
  };
};
