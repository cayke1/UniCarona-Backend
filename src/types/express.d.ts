import type { TokenPayload } from '../models/auth.model';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
