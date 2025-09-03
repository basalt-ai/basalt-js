// Example: Complete AI application with Basalt prompts and OpenTelemetry observability

import { Basalt, initOpenTelemetry } from '@basalt-ai/sdk';
import OpenAI from 'openai';

async function main() {
  // 1. Initialize OpenTelemetry instrumentation
  await initOpenTelemetry({
    serviceName: 'basalt-example-app',
    serviceVersion: '1.0.0',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    resourceAttributes: {
      'deployment.environment': process.env.NODE_ENV || 'development',
    },
  });

  // 2. Initialize Basalt SDK for prompt management
  const basalt = new Basalt({
    apiKey: process.env.BASALT_API_KEY!,
    logLevel: 'warning',
  });

  // 3. Initialize AI provider (automatically instrumented)
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  try {
    // 4. Get a prompt from Basalt (cached and managed)
    const promptResult = await basalt.prompt.get({
      slug: 'customer-support-response',
      variables: {
        customerName: 'John Doe',
        issue: 'billing question',
      },
    });

    if (promptResult.error) {
      console.error('Failed to get prompt:', promptResult.error);
      return;
    }

    const systemPrompt = promptResult.value.text;

    // 5. Make AI call - automatically traced with GenAI semantic conventions
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'I was charged twice for my subscription' },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    console.log('AI Response:', completion.choices[0].message.content);

    // 6. Optional: Create custom spans for business logic
    const { trace } = await import('@opentelemetry/api');
    const tracer = trace.getTracer('basalt-example-app');
    
    const span = tracer.startSpan('process-customer-response');
    span.setAttributes({
      'customer.name': 'John Doe',
      'issue.category': 'billing',
      'response.length': completion.choices[0].message.content?.length || 0,
    });
    
    // Your business logic here...
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
    
    span.end();

  } catch (error) {
    console.error('Application error:', error);
  }
}

// Run the example
main().catch(console.error);

// All the following traces and spans will be automatically created:
// 
// 1. HTTP span for Basalt API call to get prompt
//    - Attributes: http.method, http.url, http.status_code
//
// 2. OpenAI chat completion span with GenAI semantic conventions:
//    - gen_ai.operation.name: "chat"
//    - gen_ai.provider.name: "openai"  
//    - gen_ai.request.model: "gpt-4"
//    - gen_ai.usage.input_tokens: (actual count)
//    - gen_ai.usage.output_tokens: (actual count)
//    - gen_ai.request.temperature: 0.7
//    - gen_ai.request.max_tokens: 500
//
// 3. Custom business logic span:
//    - Custom attributes for customer and issue tracking
//
// All traces are exported via OTLP to your configured observability backend!