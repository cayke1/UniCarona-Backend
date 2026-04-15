import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string({ message: "O nome é obrigatório" })
    .min(3, "O nome deve ter pelo menos 3 caracteres"),
    
  email: z.email({ message: "Formato de e-mail inválido ou não fornecido" }),
    
  password: z.string({ message: "A senha é obrigatória" })
    .min(6, "A senha deve ter pelo menos 6 caracteres")
});

export const loginSchema = z.object({
  email: z.email({ message: "Formato de e-mail inválido ou não fornecido" }),
    
  password: z.string({ message: "A senha é obrigatória" })
    .min(1, "A senha não pode estar vazia")
});

export const refreshSchema = z.object({
  refreshToken: z.string({ message: "O refresh token é obrigatório" })
    .min(1, "O refresh token não pode estar vazio")
});

export const resetPasswordSchema = z.object({
  token: z.string({ message: "O token é obrigatório" })
    .min(1, "O token não pode estar vazio"),
    
  newPassword: z.string({ message: "A nova senha é obrigatória" })
    .min(8, "A senha deve ter pelo menos 8 caracteres")
});

export const forgotPasswordSchema = z.object({
  email: z.email({ message: "Formato de e-mail inválido ou não fornecido" })
});