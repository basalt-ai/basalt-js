import { initOpenTelemetry, shutdown } from '../lib/otel';

describe('OpenTelemetry Integration Test', () => {
  afterEach(async () => {
    await shutdown();
  });

  it('should successfully initialize and export the OpenTelemetry function', async () => {
    // Test that the function exists and can be called
    expect(typeof initOpenTelemetry).toBe('function');
    
    // Test basic initialization without errors
    await expect(initOpenTelemetry({
      serviceName: 'test-service',
      endpoint: 'http://localhost:4318/v1/traces'
    })).resolves.not.toThrow();
  });

  it('should handle environment variable configuration', async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      OTEL_SERVICE_NAME: 'env-test-service',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://env-endpoint:4318/v1/traces'
    };

    await expect(initOpenTelemetry()).resolves.not.toThrow();
    
    process.env = originalEnv;
  });

  it('should gracefully shutdown', async () => {
    await initOpenTelemetry({ serviceName: 'test-service' });
    await expect(shutdown()).resolves.not.toThrow();
  });
});