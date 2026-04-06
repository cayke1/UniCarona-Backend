import { prisma } from '../lib/prisma';

const DEFAULT_RETRY_DELAY_IN_MS = 3_000;
const DEFAULT_RETRY_ATTEMPTS = 10;

const sleep = async (durationInMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationInMs);
  });

export class DatabaseService {
  public async connectWithRetry(
    maxAttempts = DEFAULT_RETRY_ATTEMPTS,
    retryDelayInMs = DEFAULT_RETRY_DELAY_IN_MS
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await prisma.$connect();
        await this.checkHealth();
        return;
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          break;
        }

        console.warn(
          `Database connection attempt ${attempt} failed. Retrying in ${retryDelayInMs}ms.`
        );

        await sleep(retryDelayInMs);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to connect to the database.');
  }

  public async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }

  public async checkHealth(): Promise<'up'> {
    await prisma.$queryRaw`SELECT 1`;

    return 'up';
  }
}
