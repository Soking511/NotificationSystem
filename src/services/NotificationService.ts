import { INotification, INotificationService } from '../interfaces/INotification';
import { CircuitBreaker } from './CircuitBreaker';
import { PriorityQueue } from './PriorityQueue';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

export class NotificationService implements INotificationService {
  private readonly queue: PriorityQueue;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly redis: Redis;
  private readonly eventEmitter: EventEmitter;
  private isRedisConnected: boolean = false;

  constructor(redisUrl: string) {
    this.eventEmitter = new EventEmitter();
    
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    this.redis.on('connect', () => {
      this.isRedisConnected = true;
      this.eventEmitter.emit('redis:connected');
    });

    this.redis.on('error', (error) => {
      this.isRedisConnected = false;
      this.eventEmitter.emit('redis:error', error);
    });

    this.redis.on('ready', async () => {
      try {
        await this.redis.config('SET', 'stop-writes-on-bgsave-error', 'no');
      } catch (error) {
        console.error('Failed to configure Redis:', error);
      }
    });

    this.circuitBreaker = new CircuitBreaker();
    this.queue = new PriorityQueue(redisUrl);
    
    this.initializeQueueProcessor();
  }

  public async send(notification: INotification): Promise<void> {
    if (!this.isRedisConnected) {
      throw new Error('Redis is not connected. Cannot process notifications.');
    }

    notification.timestamp = new Date();
    notification.status = 'pending';
    
    try {
      await this.queue.enqueue(notification);
      await this.redis.set(`notification:${notification.id}`, JSON.stringify(notification));
      this.eventEmitter.emit('notification:queued', notification);
    } catch (error) {
      this.eventEmitter.emit('notification:error', { 
        notification, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  public async getStatus(notificationId: string): Promise<string> {
    if (!this.isRedisConnected) {
      throw new Error('Redis is not connected. Cannot retrieve notification status.');
    }

    const notification = await this.redis.get(`notification:${notificationId}`);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return JSON.parse(notification).status;
  }

  private async initializeQueueProcessor(): Promise<void> {
    await this.queue.processJobs(async (notification: INotification) => {
      try {
        await this.circuitBreaker.execute(async () => {
          await this.sendToExternalService(notification);
          
          notification.status = 'delivered';
          await this.redis.set(`notification:${notification.id}`, JSON.stringify(notification));
          
          this.eventEmitter.emit('notification:delivered', notification);
        });
      } catch (error) {
        notification.status = 'failed';
        await this.redis.set(`notification:${notification.id}`, JSON.stringify(notification));
        
        this.eventEmitter.emit('notification:failed', {
          notification,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error;
      }
    });
  }

  private async sendToExternalService(notification: INotification): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  public onNotificationEvent(
    event: 'notification:queued' | 'notification:delivered' | 'notification:failed' | 'redis:error' | 'redis:connected',
    handler: (data: any) => void
  ): void {
    this.eventEmitter.on(event, handler);
  }

  public async isHealthy(): Promise<boolean> {
    return this.isRedisConnected;
  }
}
