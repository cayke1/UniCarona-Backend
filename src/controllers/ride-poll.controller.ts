import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/app-error';
import { RideService } from '../services/ride.service';
import { ridePollService } from '../services/ride-poll.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_TIMEOUT_MS = 30_000;

const rideService = new RideService();

export async function pollRideUpdates(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const id = req.params.id as string;

  try {
    if (!UUID_REGEX.test(id)) throw new AppError('Invalid ride ID format', 400);
  } catch (error) {
    next(error);
    return;
  }

  const event = `ride:${id}`;

  const updated = await new Promise<boolean>((resolve) => {
    let settled = false;

    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const onEvent = () => {
      ridePollService.off(event, onEvent);
      clearTimeout(timer);
      settle(true);
    };

    const timer = setTimeout(() => {
      ridePollService.off(event, onEvent);
      settle(false);
    }, POLL_TIMEOUT_MS);

    // resolve immediately if client disconnects to avoid holding the promise open
    req.on('close', () => settle(false));
    ridePollService.once(event, onEvent);
  });

  if (!updated || res.headersSent) {
    if (!res.headersSent) res.status(304).end();
    return;
  }

  try {
    const ride = await rideService.getRideById(id as string);
    res.status(200).json(ride);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      // ride no longer active — signal the client to refresh
      res.status(200).json({ id, status: 'CANCELLED' });
      return;
    }
    next(error);
  }
}
