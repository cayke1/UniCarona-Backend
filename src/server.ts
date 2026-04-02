import 'dotenv/config';
import { app } from './app';
import { DatabaseService } from './services/database.service';

const port = Number(process.env.PORT) || 3000;
const databaseService = new DatabaseService();

const startServer = async (): Promise<void> => {
  try {
    await databaseService.connectWithRetry();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start the application.', error);
    process.exit(1);
  }
};

void startServer();

const shutdown = async (): Promise<void> => {
  await databaseService.disconnect();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
