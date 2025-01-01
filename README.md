# Notification System

A robust and scalable notification system built with TypeScript and Node.js, featuring priority queues, circuit breakers, and Redis integration for reliable message delivery.

## Features

- **Priority-based Queue System**: Handles notifications with different priority levels (high, medium, low)
- **Circuit Breaker Pattern**: Prevents system overload and handles failures gracefully
- **Redis Integration**: Reliable message storage and retrieval
- **Event-driven Architecture**: Asynchronous notification processing
- **Health Monitoring**: Built-in health checks and status tracking

## Technology Stack

- Node.js
- TypeScript
- Redis
- Bull Queue
- Express.js
- Jest (Testing)

## Prerequisites

- Node.js (v14 or higher)
- Redis Server
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Soking511/NotificationSystem
cd notification-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your configuration:
```env
REDIS_URL=redis://localhost:6379
PORT=3000
```

4. Start the service:
```bash
npm run start
```

## API Documentation

### Send Notification
```http
POST /api/notifications
```

Request body:
```json
{
    "id": "unique-id",
    "type": "email",
    "payload": {
        "subject": "Notification Subject",
        "content": "Notification Content"
    },
    "priority": "high",
    "recipient": "user@example.com"
}
```

### Check Notification Status
```http
GET /api/notifications/{notificationId}/status
```

### Health Check
```http
GET /api/health
```

## Architecture

The system consists of several key components:

1. **NotificationService**: Main service handling notification processing
2. **PriorityQueue**: Manages notification priorities using Bull
3. **CircuitBreaker**: Implements circuit breaker pattern for failure handling
4. **Redis Store**: Persistent storage for notifications

## Error Handling

- Circuit breaker pattern for external service failures
- Automatic retries with exponential backoff
- Dead letter queues for failed notifications
- Comprehensive error logging

## Monitoring

- Health check endpoints
- Event-based monitoring
- Redis connection status
- Queue metrics

## Testing

Run the test suite:
```bash
npm run test
```

Run with coverage:
```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
