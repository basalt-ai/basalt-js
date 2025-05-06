# Basalt SDK Telemetry

The Basalt SDK includes built-in telemetry capabilities using OpenTelemetry. This allows you to collect metrics about your prompt executions and analyze them.

## Metrics Collected

When telemetry is enabled, the SDK will automatically collect and send the following metrics:

- **Cost** - The cost of prompt executions
- **Latency** - Time taken for prompt execution (from start to end)
- **Input Tokens** - Number of tokens in the prompt input
- **Output Tokens** - Number of tokens in the generated output

Each metric includes important context such as:

- Feature slug
- Prompt slug and version
- Deployment tag
- Organization ID and name
- User ID and name

## Enabling Telemetry

To enable telemetry in your application, add the telemetry configuration when initializing the SDK:

```typescript
import { BasaltSDK } from '@basalt-ai/sdk';

const sdk = new BasaltSDK({
  apiKey: 'your-api-key',
  telemetry: {
    enabled: true,
    endpoint: 'http://localhost:4318', // OTel collector endpoint
    samplingRate: 1.0 // Optional sampling rate (0.0 to 1.0)
  }
});
```

### Configuration Options

The `telemetry` configuration object accepts the following options:

- `enabled` (boolean, required): Enables or disables telemetry collection
- `endpoint` (string, optional): The URL of the OpenTelemetry collector (default: 'http://localhost:4318')
- `samplingRate` (number, optional): The percentage of telemetry data to collect (between 0.0 and 1.0, default: 1.0)

## Telemetry Flow

When telemetry is enabled, the SDK automatically:

1. Initializes the OpenTelemetry SDK
2. Creates meters to track the relevant metrics
3. Captures metrics when traces and generations are created and completed
4. Sends metrics to the configured OpenTelemetry collector endpoint

No additional code is required to collect telemetry data beyond enabling it in the SDK configuration.

## Local Development

For local development, you'll need to run the Basalt OpenTelemetry collector and Clickhouse. The easiest way to do this is to use Docker Compose:

```bash
npm run docker-start:telemetry
```

This will start:
- The Clickhouse database
- The OTel collector

## Disabling Telemetry

If you wish to disable telemetry, you can:

1. Set `enabled: false` in the telemetry configuration
2. Omit the telemetry configuration entirely when initializing the SDK

For example:

```typescript
// Explicitly disabled
const sdk = new BasaltSDK({
  apiKey: 'your-api-key',
  telemetry: {
    enabled: false
  }
});

// Implicitly disabled (no telemetry config)
const sdk = new BasaltSDK({
  apiKey: 'your-api-key'
});
```

## Data Privacy

The telemetry system does not collect any sensitive user data or prompt content. It only collects metrics about prompt executions, such as cost, latency, and token counts, along with identifying information like slugs and IDs.