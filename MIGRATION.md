# Migration Guide: v0.x to v1.0

This guide helps you migrate from Basalt SDK v0.x to v1.0, which introduces breaking changes by replacing the custom monitoring system with OpenTelemetry instrumentation.

## Overview of Changes

### What's New ✨
- **OpenTelemetry Integration**: Full OpenTelemetry instrumentation with GenAI semantic conventions
- **Auto-instrumentation**: Automatic tracing for OpenAI, HTTP, and undici calls
- **Standard Observability**: OTLP export to any OpenTelemetry-compatible backend
- **Environment Variable Support**: Standard OTEL_* environment variables

### What's Removed ❌
- Custom monitoring APIs (`basalt.monitor.*`)
- Manual trace/generation/log creation
- Custom Basalt trace endpoints and transport
- Flusher utility and custom trace objects

## Breaking Changes

### 1. Monitor API Removed

```javascript
// ❌ v0.x - NO LONGER AVAILABLE
import { Basalt } from '@basalt-ai/sdk';
const basalt = new Basalt({ apiKey: process.env.BASALT_API_KEY });

// These APIs no longer exist:
const trace = basalt.monitor.createTrace('user-query');
const generation = basalt.monitor.createGeneration({
  name: 'text-completion',
  trace: trace,
  prompt: { slug: 'my-prompt', version: '1.0.0' }
});
const log = basalt.monitor.createLog({
  name: 'processing-step',
  trace: trace
});

// ✅ v1.0 - Use OpenTelemetry instead
import { initOpenTelemetry } from '@basalt-ai/sdk';

await initOpenTelemetry({
  serviceName: 'my-ai-app',
  endpoint: 'http://localhost:4318/v1/traces'
});

// AI calls are automatically instrumented
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### 2. Prompt API Changes

The prompt API return type has changed to remove the `generation` property:

```javascript
// ❌ v0.x
const result = await basalt.prompt.get('my-prompt');
if (result.error) {
  console.error(result.error);
} else {
  console.log('Prompt:', result.value.text);
  console.log('Generation:', result.generation); // No longer available
}

// ✅ v1.0
const result = await basalt.prompt.get('my-prompt');
if (result.error) {
  console.error(result.error);
} else {
  console.log('Prompt:', result.value.text);
  // Monitoring is now handled automatically via OpenTelemetry
}
```

## Migration Steps

### Step 1: Update Dependencies

```bash
npm install @basalt-ai/sdk@^1.0.0
```

### Step 2: Remove Monitor Code

Remove all usage of `basalt.monitor.*` APIs:

```javascript
// Remove these imports/usage:
// - basalt.monitor.createTrace()
// - basalt.monitor.createGeneration()  
// - basalt.monitor.createLog()
// - basalt.monitor.createExperiment()
```

### Step 3: Add OpenTelemetry Initialization

Add OpenTelemetry setup at the start of your application:

```javascript
import { initOpenTelemetry } from '@basalt-ai/sdk';

// Basic setup
await initOpenTelemetry({
  serviceName: 'your-app-name',
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
});
```

### Step 4: Remove Custom Trace Logic

Replace manual tracing with automatic instrumentation:

```javascript
// ❌ Old manual tracing
const trace = basalt.monitor.createTrace('openai-completion');
trace.start('Generate response for user query');

const generation = basalt.monitor.createGeneration({
  name: 'gpt-4-completion',
  trace: trace,
  input: userMessage,
});

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: userMessage }],
});

generation.end({
  output: response.choices[0].message.content,
  inputTokens: response.usage.prompt_tokens,
  outputTokens: response.usage.completion_tokens,
});

trace.end('Response generated successfully');

// ✅ New automatic tracing
// Just make the AI call - it's automatically traced!
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: userMessage }],
});
```

### Step 5: Configure Your Observability Backend

Set up your preferred observability platform:

#### Jaeger (Local Development)
```bash
# docker-compose.yml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14250:14250"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

```javascript
await initOpenTelemetry({
  serviceName: 'my-app',
  endpoint: 'http://localhost:14268/api/traces'
});
```

#### Honeycomb
```javascript
await initOpenTelemetry({
  serviceName: 'my-app',
  endpoint: 'https://api.honeycomb.io/v1/traces/your-dataset',
  headers: {
    'x-honeycomb-team': process.env.HONEYCOMB_API_KEY
  }
});
```

#### Datadog
```javascript
await initOpenTelemetry({
  serviceName: 'my-app',
  endpoint: 'https://trace-agent.datadoghq.com/v0.4/traces',
  headers: {
    'DD-API-KEY': process.env.DD_API_KEY
  }
});
```

## What You Get with OpenTelemetry

### Automatic GenAI Semantic Conventions

All AI provider calls are automatically enriched with standard attributes:

- `gen_ai.operation.name`: `chat`, `embeddings`, `text_completion`
- `gen_ai.provider.name`: `openai`, `mistral_ai`, `anthropic`
- `gen_ai.request.model`: `gpt-4`, `mistral-large`, etc.
- `gen_ai.usage.input_tokens`: Token usage for input
- `gen_ai.usage.output_tokens`: Token usage for output
- Request parameters: `temperature`, `max_tokens`, etc.

### Supported Providers Out of the Box

- **OpenAI**: Automatic instrumentation via auto-instrumentations
- **Mistral AI**: HTTP instrumentation captures API calls
- **Anthropic**: HTTP instrumentation captures API calls
- **Custom HTTP APIs**: Any provider using HTTP/fetch

### Standard Environment Variables

```bash
# Standard OpenTelemetry environment variables
export OTEL_SERVICE_NAME="my-ai-app"
export OTEL_SERVICE_VERSION="1.0.0" 
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/traces"
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=your-key"
```

## Advanced Migration Scenarios

### Multiple AI Providers

```javascript
// ❌ Old way - manual tracking for each provider
const openaiTrace = basalt.monitor.createTrace('openai-call');
const mistralTrace = basalt.monitor.createTrace('mistral-call');

// ✅ New way - automatic for all providers
await initOpenTelemetry({
  serviceName: 'multi-provider-app',
  instrumentationConfig: {
    genaiHosts: [
      'api.openai.com',
      'api.mistral.ai', 
      'api.anthropic.com'
    ]
  }
});

// All calls automatically traced with proper provider attribution
const openaiResponse = await openai.chat.completions.create({...});
const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {...});
```

### Custom Spans for Business Logic

```javascript
// ❌ Old way - custom logs
const processingLog = basalt.monitor.createLog({
  name: 'document-processing',
  trace: trace
});

// ✅ New way - OpenTelemetry spans
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');
const span = tracer.startSpan('document-processing');

try {
  // Your business logic
  span.setAttributes({
    'document.type': 'pdf',
    'document.size': fileSize
  });
  
  const result = await processDocument();
  span.setStatus({ code: SpanStatusCode.OK });
  return result;
} finally {
  span.end();
}
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Ensure you've updated to `@basalt-ai/sdk@^1.0.0`

2. **No traces appearing**: Check your OTLP endpoint configuration and ensure your collector/backend is running

3. **Missing GenAI attributes**: Verify auto-instrumentations are enabled and your AI provider is supported

4. **Performance concerns**: OpenTelemetry instrumentation has minimal overhead, but you can disable specific instrumentations if needed

### Debugging

Enable OpenTelemetry debug logging:

```bash
export OTEL_LOG_LEVEL=debug
export NODE_OPTIONS="--trace-warnings"
```

### Getting Help

- Check the [OpenTelemetry JavaScript documentation](https://opentelemetry.io/docs/instrumentation/js/)
- Review [GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- Open an issue in the Basalt SDK repository

## Benefits of the Migration

### Before (v0.x)
- Manual instrumentation required
- Custom trace format
- Limited to Basalt backend
- GenAI-specific implementation

### After (v1.0)
- Automatic instrumentation 
- Industry-standard traces
- Works with any OTLP-compatible backend
- Rich ecosystem of tools and integrations
- Better performance and reliability

The migration enables you to use the full OpenTelemetry ecosystem while getting better observability into your AI applications with minimal code changes.