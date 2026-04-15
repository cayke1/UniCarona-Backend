import { Resend } from 'resend';
import { AppError } from './app-error';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.MAIL_FROM || 'UniCarona <onboarding@dellanne-dev.online>';

export async function sendResetPasswordEmail(
  email: string,
  token: string
): Promise<void> {
  const resetLink = `https://UniCarona.com/auth/reset-password?token=${token}`;

  try {
    const { error } = await resend.emails.send({
      from: process.env.MAIL_FROM || FROM_EMAIL,
      to: email,
      subject: 'Recuperação de Senha - UniCarona',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #2D3748; text-align: center;">Recuperação de Senha</h2>
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>UniCarona</strong>.</p>
          <p>Para prosseguir com a redefinição, clique no botão abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #4A5568; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Redefinir Minha Senha
            </a>
          </div>
          <p style="font-size: 0.9em; color: #718096;">
            Se você não solicitou esta alteração, por favor ignore este e-mail.
          </p>
          <p style="font-size: 0.8em; color: #A0AEC0; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            Este link expira em 5 minutos.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend Error:', error);
      throw new AppError('Erro ao enviar e-mail de recuperação', 500);
    }
  } catch (err) {
    console.error('Failed to send email:', err);
    throw new AppError('Erro ao processar envio de e-mail', 500);
  }
}
