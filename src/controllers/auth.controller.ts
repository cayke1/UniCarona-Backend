import type { NextFunction, Request, Response } from 'express';
import type { AuthService } from '../services/auth.service';
import type { RegisterBody, LoginBody, RefreshBody } from '../models/auth.model';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public register = async (
    request: Request<{}, {}, RegisterBody>,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.register(request.body);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  public login = async (
    request: Request<{}, {}, LoginBody>,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.login(request.body);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public refresh = async (
    request: Request<{}, {}, RefreshBody>,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = request.body;
      const result = await this.authService.refresh(refreshToken);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public logout = async (
    request: Request<{}, {}, RefreshBody>,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = request.body;
      await this.authService.logout(refreshToken);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
