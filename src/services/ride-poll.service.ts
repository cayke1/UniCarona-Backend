import { EventEmitter } from 'events';

class RidePollService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
  }

  notifyRideUpdated(rideId: string): void {
    this.emit(`ride:${rideId}`);
  }
}

export const ridePollService = new RidePollService();
