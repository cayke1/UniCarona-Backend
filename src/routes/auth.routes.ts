import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { validateData } from '../middlewares/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshSchema
} from '../schemas/auth.schema';

const authRoutes = Router();
const authService = new AuthService();
const authController = new AuthController(authService);

authRoutes.post('/register', validateData(registerSchema), authController.register);
authRoutes.post('/login', validateData(loginSchema), authController.login);
authRoutes.post('/refresh', validateData(refreshSchema), authController.refresh);
authRoutes.post('/logout', validateData(refreshSchema), authController.logout);

export { authRoutes };
