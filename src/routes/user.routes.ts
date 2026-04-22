import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { userController } from '../controllers/user.controller';

const userRoutes = Router();

/**
 * @example Rota protegida que retorna o perfil do usuário logado
 * GET /api/users/me
 */
userRoutes.get('/me', authMiddleware, userController.getMe);
userRoutes.get('/me/requests', authMiddleware, userController.getMyRequests);

export { userRoutes };
