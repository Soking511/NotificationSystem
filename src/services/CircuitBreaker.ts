import { ICircuitBreaker } from '../interfaces/INotification';

export class CircuitBreaker implements ICircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime?: Date;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(
    failureThreshold: number = 5,
    resetTimeout: number = 60000 
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  public async execute<T>(command: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await command();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  public getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    
    const now = new Date();
    return now.getTime() - this.lastFailureTime.getTime() >= this.resetTimeout;
  }
}
