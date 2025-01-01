import { PriorityQueue } from '../PriorityQueue';
import { INotification } from '../../interfaces/INotification';
import Bull from 'bull';

jest.mock('bull');

describe('PriorityQueue', () => {
  let priorityQueue: PriorityQueue;
  let mockQueue: jest.Mocked<Bull.Queue>;

  beforeEach(() => {
    mockQueue = {
      add: jest.fn(),
      getNextJob: jest.fn(),
      process: jest.fn(),
    } as unknown as jest.Mocked<Bull.Queue>;

    (Bull as jest.MockedClass<typeof Bull>).mockImplementation(() => mockQueue);
    
    priorityQueue = new PriorityQueue('redis://localhost:6379');
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

  it('should enqueue notification with correct priority', async () => {
    await priorityQueue.enqueue(mockNotification);

    expect(mockQueue.add).toHaveBeenCalledWith(
      mockNotification,
      expect.objectContaining({
        priority: 1,
        jobId: mockNotification.id
      })
    );
  });

  it('should handle different priority levels correctly', async () => {
    const notifications: INotification[] = [
      { ...mockNotification, priority: 'high' as const },
      { ...mockNotification, priority: 'medium' as const, id: '456' },
      { ...mockNotification, priority: 'low' as const, id: '789' }
    ];

    for (const notification of notifications) {
      await priorityQueue.enqueue(notification);
    }

    expect(mockQueue.add).toHaveBeenCalledTimes(3);
    expect(mockQueue.add).toHaveBeenNthCalledWith(
      1,
      notifications[0],
      expect.objectContaining({ priority: 1 })
    );
    expect(mockQueue.add).toHaveBeenNthCalledWith(
      2,
      notifications[1],
      expect.objectContaining({ priority: 2 })
    );
    expect(mockQueue.add).toHaveBeenNthCalledWith(
      3,
      notifications[2],
      expect.objectContaining({ priority: 3 })
    );
  });

  it('should return null when no jobs are available', async () => {
    mockQueue.getNextJob.mockResolvedValue(undefined);
    
    const result = await priorityQueue.dequeue();
    expect(result).toBeNull();
  });

  it('should process jobs with handler', async () => {
    const mockHandler = jest.fn();
    await priorityQueue.processJobs(mockHandler);

    expect(mockQueue.process).toHaveBeenCalled();
  });
});
