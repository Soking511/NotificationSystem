import { NotificationService } from '../NotificationService';
import { INotification } from '../../interfaces/INotification';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

jest.mock('ioredis');
jest.mock('../PriorityQueue');
jest.mock('../CircuitBreaker');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
    
    notificationService = new NotificationService('redis://localhost:6379');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockNotification: INotification = {
    id: '123',
    type: 'email',
    payload: { message: 'test' },
    priority: 'high',
    timestamp: new Date(),
    recipient: 'test@example.com',
    status: 'pending'
  };

  describe('send', () => {
    it('should store notification in Redis and emit event', async () => {
      const eventSpy = jest.spyOn(EventEmitter.prototype, 'emit');

      await notificationService.send(mockNotification);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `notification:${mockNotification.id}`,
        expect.any(String)
      );
      expect(eventSpy).toHaveBeenCalledWith('notification:queued', mockNotification);
    });
  });

  describe('getStatus', () => {
    it('should return notification status from Redis', async () => {
      const mockStoredNotification = { ...mockNotification, status: 'delivered' };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockStoredNotification));

      const status = await notificationService.getStatus('123');
      expect(status).toBe('delivered');
    });

    it('should throw error when notification not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(notificationService.getStatus('123'))
        .rejects.toThrow('Notification not found');
    });
  });

  describe('event handling', () => {
    it('should register event handlers correctly', () => {
      const mockHandler = jest.fn();
      
      notificationService.onNotificationEvent('notification:delivered', mockHandler);
      
      const eventEmitter = (notificationService as any).eventEmitter;
      expect(eventEmitter.listenerCount('notification:delivered')).toBe(1);
    });
  });
});
