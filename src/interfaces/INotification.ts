export interface INotification {
  id: string;
  type: string;
  payload: unknown;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  recipient: string;
  status: 'pending' | 'delivered' | 'failed';
}

export interface INotificationService {
  send(notification: INotification): Promise<void>;
  getStatus(notificationId: string): Promise<string>;
}

export interface INotificationQueue {
  enqueue(notification: INotification): Promise<void>;
  dequeue(): Promise<INotification | null>;
}

export interface ICircuitBreaker {
  execute<T>(command: () => Promise<T>): Promise<T>;
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
