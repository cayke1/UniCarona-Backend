import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { userController } from '../controllers/user.controller';

const userRoutes = Router();

/**
 * @example Rota protegida que retorna o perfil do usuário logado
 * GET /api/users/me
 */
userRoutes.get('/me', authMiddleware, userController.getMe);

/**
 * @example Rota protegida para atualizar o perfil do usuário logado
 * PUT /api/users/me
 */
userRoutes.put('/me', authMiddleware, userController.updateMe);

/**
 * @example Rota protegida para promover o usuário atual para DRIVER
 * POST /api/users/me/role
 */
userRoutes.post('/me/role', authMiddleware, userController.promoteToDriver);

export { userRoutes };
