import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

export const validateData = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errorDetails = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        error: true,
        message: 'Invalid input data.',
        fields: errorDetails
      });
    }

    return next();
  };
};
