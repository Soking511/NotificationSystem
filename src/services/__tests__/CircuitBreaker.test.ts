import { CircuitBreaker } from '../CircuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(2, 1000); // 2 failures, 1 second timeout
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should execute successful commands', async () => {
    const result = await circuitBreaker.execute(async () => 'success');
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should transition to OPEN after failures threshold', async () => {
    const failingCommand = async () => {
      throw new Error('Service error');
    };

    // First failure
    await expect(circuitBreaker.execute(failingCommand)).rejects.toThrow('Service error');
    expect(circuitBreaker.getState()).toBe('CLOSED');

    // Second failure - should open circuit
    await expect(circuitBreaker.execute(failingCommand)).rejects.toThrow('Service error');
    expect(circuitBreaker.getState()).toBe('OPEN');

    // Should reject immediately when open
    await expect(circuitBreaker.execute(async () => 'success'))
      .rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should transition to HALF_OPEN after timeout', async () => {
    const failingCommand = async () => {
      throw new Error('Service error');
    };

    // Fail twice to open circuit
    await expect(circuitBreaker.execute(failingCommand)).rejects.toThrow();
    await expect(circuitBreaker.execute(failingCommand)).rejects.toThrow();
    expect(circuitBreaker.getState()).toBe('OPEN');

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Next execution should be in HALF_OPEN state
    const successCommand = async () => 'success';
    const result = await circuitBreaker.execute(successCommand);
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });
});
