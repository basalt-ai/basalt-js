# Basalt SDK

Basalt is a powerful tool for managing AI prompts and their release workflows. This SDK is the official NodeJS package for interacting with your Basalt prompts, with built-in OpenTelemetry instrumentation for observability.

## Installation

Install the Basalt SDK via npm:

```bash
npm install @basalt-ai/sdk
```

## Usage

### Importing and Initializing the SDK

To get started, import the `Basalt` class and initialize it with your API key:

```javascript
// Using module syntax
import { Basalt } from '@basalt-ai/sdk'

// Using CommonJS syntax
const { Basalt } = require('@basalt-ai/sdk');

const basalt = new Basalt({
    apiKey: 'your-api-key-here',
});

// Don't forget to put your apiKey into an env variable
const basalt = new Basalt({
    apiKey: process.env.BASALT_API_KEY
})
```

### OpenTelemetry Monitoring

**NEW in v1.0**: The Basalt SDK now uses OpenTelemetry for monitoring and observability instead of custom monitoring APIs.

#### Quick Start with OpenTelemetry

Initialize OpenTelemetry instrumentation before using AI services:

```javascript
import { initOpenTelemetry } from '@basalt-ai/sdk';

// Initialize with basic configuration
await initOpenTelemetry({
  serviceName: 'my-ai-app',
  endpoint: 'http://localhost:4318/v1/traces'
});

// Now use your AI providers - they'll be automatically instrumented
// Example with OpenAI
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// This call will be automatically traced with GenAI semantic conventions
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello, world!" }],
});
```

#### Advanced OpenTelemetry Configuration

```javascript
import { initOpenTelemetry } from '@basalt-ai/sdk';

await initOpenTelemetry({
  // Service identification
  serviceName: 'my-ai-app',
  serviceVersion: '1.0.0',
  
  // OTLP exporter configuration
  endpoint: 'https://api.honeycomb.io/v1/traces/my-dataset',
  exporterType: 'http', // or 'grpc'
  headers: {
    'x-honeycomb-team': process.env.HONEYCOMB_API_KEY
  },
  
  // Resource attributes
  resourceAttributes: {
    'deployment.environment': 'production',
    'service.namespace': 'ai-services'
  },
  
  // Instrumentation configuration
  enableAutoInstrumentations: true,  // OpenAI and other auto-instrumentations
  enableHttpInstrumentation: true,   // For providers like Mistral
  enableUndiciInstrumentation: true, // For fetch-based calls
  
  instrumentationConfig: {
    genaiHosts: ['api.openai.com', 'api.mistral.ai', 'api.anthropic.com']
  }
});
```

#### Environment Variables

You can also configure OpenTelemetry using standard environment variables:

```bash
export OTEL_SERVICE_NAME="my-ai-app"
export OTEL_SERVICE_VERSION="1.0.0"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/traces"
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=your-api-key"
```

#### Supported AI Providers

The OpenTelemetry instrumentation automatically instruments:

- **OpenAI** (via auto-instrumentations)
- **Mistral AI** (via HTTP instrumentation)  
- **Anthropic** (via HTTP instrumentation)
- **Any HTTP/fetch-based providers** (via HTTP/undici instrumentations)

All traces include proper GenAI semantic conventions with attributes like:
- `gen_ai.operation.name` (chat, embeddings, etc.)
- `gen_ai.provider.name` (openai, mistral_ai, etc.)
- `gen_ai.request.model` and `gen_ai.response.model`
- `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens`
- Request parameters (temperature, max_tokens, etc.)

#### Migration from v0.x

**BREAKING CHANGE**: The manual monitoring APIs (`createTrace`, `createGeneration`, `createLog`) have been removed in v1.0. Instead, use OpenTelemetry instrumentation:

```javascript
// ❌ Old way (v0.x) - NO LONGER AVAILABLE
const trace = basalt.monitor.createTrace('user-query');
const generation = basalt.monitor.createGeneration({...});

// ✅ New way (v1.0+) - Use OpenTelemetry
import { initOpenTelemetry } from '@basalt-ai/sdk';
await initOpenTelemetry({ serviceName: 'my-app' });

// AI calls are automatically traced with proper semantic conventions
const response = await openai.chat.completions.create({...});
```

### API Spec

#### Basalt

- **Constructors**

  The Basalt constructor accepts following options:
  
  - `apiKey: string`: The API Key you generated from your Basalt workspace.
  - `logLevel?: "all" | "warning" | "none"` 

    Configure what Basalt logs to the console. Recommended: `warning` at dev, `none` in production. 

#### Basalt.Prompt

The `prompt` attribute provides methods to interact with your Basalt prompts:

- **Get a Prompt**

  Retrieve a specific prompt using a slug, and optional filters `tag` and `version`. Without tag or version would, the production version of your prompt is selected by default.

  **Example Usage:**

  ```typescript
  // With a single object. Tag and filters are still optional,
  // use this if you need more control over the specific version of
  // the prompt to select
  const result = await basalt.prompt.get({ slug: 'prompt-slug', tag: 'custom-tag' });
  const result = await basalt.prompt.get({ slug: 'prompt-slug', version: '1.0.0' });

  // With the slug, leaving the rest optional
  // this is useful for easily fetching the prod version of prompts
  const result = await basalt.prompt.get('prompt-slug');

  // This is also valid
  const result = await basalt.prompt.get('prompt-slug', { tag: 'latest' });
  const result = await basalt.prompt.get('prompt-slug', { version: '1.0.0' });

  // If your prompt has variables,they need to be provided
  // in the options.
  // Example prompt: "Hello {{name}}"
  const result = await basalt.prompt.get({
	slug: 'prompt-slug',
	variables: {
		name: "John Doe"
	}
  })

  // Handle the result by unwrapping the error / value
  if (result.error) {
    console.log('Could not fetch prompt', result.error.message);
    return;
  }

  // Use the prompt with your AI provider of choice
  // Example: OpenAI
  openaiClient.chat.completion.create({
	model: 'gpt-4o'
	messages: [{ role: 'User', content: result.value.text }]
  })
  ```

### In-Memory Cache

The Basalt SDK includes an in-memory caching mechanism to improve performance by reducing redundant API calls. When you request a prompt multiple times with the same parameters, the SDK can serve it from the cache instead of making additional network requests.

#### How the Cache Works

The SDK implements a simple but effective in-memory cache through the `MemoryCache` class that:

- Stores key-value pairs in memory
- Supports configurable time-to-live (TTL) for each cached entry
- Automatically invalidates expired entries

```typescript
// Example of how caching works internally
// (You don't need to implement this yourself)

// First request fetches from API and caches the result
const result1 = await basalt.prompt.get('my-prompt');

// Subsequent identical requests within the TTL period 
// will be served from cache
const result2 = await basalt.prompt.get('my-prompt');
```

#### Cache Configuration

By default, the cache is enabled with reasonable defaults. You can configure the cache behavior when initializing the SDK:

```typescript
const basalt = new Basalt({
    apiKey: process.env.BASALT_API_KEY,
    cache: {
        enabled: true,     // Enable/disable caching (default: true)
        ttl: 60000,        // Default TTL in milliseconds (default: 60000 - 1 minute)
    }
});
```

#### Cache Benefits

- **Improved Performance**: Reduces latency for frequently accessed prompts
- **Reduced API Usage**: Minimizes the number of API calls to the Basalt service
- **Offline Resilience**: Previously cached prompts remain available even during temporary network issues

The cache is particularly useful in high-throughput applications where the same prompts are requested multiple times in a short period.

## OpenTelemetry Collector Example

For a complete setup with a local collector, create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yml"]
    volumes:
      - ./otel-collector-config.yml:/etc/otel-collector-config.yml
    ports:
      - "4317:4317"   # OTLP gRPC receiver
      - "4318:4318"   # OTLP HTTP receiver
      - "8889:8889"   # Prometheus metrics
    depends_on:
      - jaeger

  # Jaeger for trace visualization
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14250:14250"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

And a corresponding `otel-collector-config.yml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger]
```

Then initialize your application:

```javascript
import { initOpenTelemetry } from '@basalt-ai/sdk';

await initOpenTelemetry({
  serviceName: 'my-ai-app',
  endpoint: 'http://localhost:4318/v1/traces'
});
```

Visit `http://localhost:16686` to view traces in Jaeger UI.

## License

This project is licensed under the MIT License.