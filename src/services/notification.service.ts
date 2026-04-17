export class NotificationService {
  async notify(userId: string, title: string, body: string): Promise<void> {
    console.log(`[Notification] To User ${userId}: ${title} - ${body}`);
    // Simulate notification call
    return Promise.resolve();
  }
}

export const notificationService = new NotificationService();
