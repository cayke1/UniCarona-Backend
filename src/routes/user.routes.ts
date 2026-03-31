import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';

const userRoutes = Router();

/**
 * @example Rota protegida que retorna o perfil do usuário logado
 * GET /api/users/profile
 */
userRoutes.get('/profile', authMiddleware, (req: Request, res: Response) => {
  return res.json({
    user: req.user,
  });
});

export { userRoutes };
