import express from 'express';
import dotenv from 'dotenv';
import { NotificationService } from './services/NotificationService';
import { v4 as uuidv4 } from 'uuid';
import { INotification } from './interfaces/INotification';
import winston from 'winston';

dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const port = process.env.PORT || 3000;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let notificationService: NotificationService;

try {
  notificationService = new NotificationService(redisUrl);
  
  // Event handlers for monitoring
  notificationService.onNotificationEvent('notification:queued', (notification) => {
    logger.info('Notification queued:', { id: notification.id });
  });

  notificationService.onNotificationEvent('notification:delivered', (notification) => {
    logger.info('Notification delivered:', { id: notification.id });
  });

  notificationService.onNotificationEvent('notification:failed', (data) => {
    logger.error('Notification failed:', { id: data.notification.id, error: data.error });
  });
} catch (error) {
  logger.error('Failed to initialize notification service:', error);
  process.exit(1);
}

app.use(express.json());

// API endpoints
app.post('/notifications', async (req, res) => {
  try {
    const { type, payload, priority, recipient } = req.body;

    if (!type || !payload || !recipient) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, payload, and recipient are required' 
      });
    }

    const notification: INotification = {
      id: uuidv4(),
      type,
      payload,
      priority: priority || 'low',
      timestamp: new Date(),
      recipient,
      status: 'pending'
    };

    await notificationService.send(notification);
    logger.info('Notification sent successfully', { id: notification.id });
    res.status(202).json({ id: notification.id });
  } catch (error) {
    logger.error('Error sending notification:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

app.get('/notifications/:id/status', async (req, res) => {
  try {
    const status = await notificationService.getStatus(req.params.id);
    res.json({ status });
  } catch (error) {
    logger.error('Error getting notification status:', { id: req.params.id, error });
    res.status(404).json({ error: 'Notification not found' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const isRedisHealthy = await notificationService.isHealthy();
    const status = isRedisHealthy ? 'healthy' : 'degraded';
    
    res.json({
      status,
      components: {
        redis: {
          status: isRedisHealthy ? 'connected' : 'disconnected'
        },
        api: {
          status: 'running',
          uptime: process.uptime()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
