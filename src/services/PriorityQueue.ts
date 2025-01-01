import Bull from 'bull';
import { INotification, INotificationQueue } from '../interfaces/INotification';

export class PriorityQueue implements INotificationQueue {
  private readonly queue: Bull.Queue;
  
  constructor(redisUrl: string) {
    this.queue = new Bull('notifications', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true
      }
    });
  }

  public async enqueue(notification: INotification): Promise<void> {
    const priority = this.getPriorityValue(notification.priority);
    await this.queue.add(notification, { 
      priority,
      jobId: notification.id
    });
  }

  public async dequeue(): Promise<INotification | null> {
    const job = await this.queue.getNextJob();
    if (!job) return null;

    const notification = job.data as INotification;
    await job.remove();
    return notification;
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'medium':
        return 2;
      case 'low':
        return 3;
      default:
        return 3;
    }
  }

  public async processJobs(
    handler: (notification: INotification) => Promise<void>
  ): Promise<void> {
    this.queue.process(async (job) => {
      const notification = job.data as INotification;
      await handler(notification);
    });
  }
}
