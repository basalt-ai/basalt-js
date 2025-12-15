/**
 * Example: Using Basalt SDK with OpenTelemetry Instrumentation
 *
 * This example demonstrates how to use the Basalt SDK with OpenTelemetry
 * for automatic distributed tracing of SDK operations.
 */

import { NodeSDK } from '@opentelemetry/sdk-node'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { Basalt, BasaltContextManager } from '@basalt-ai/sdk'

// ============================================================================
// 1. Configure OpenTelemetry
// ============================================================================

const otelSdk = new NodeSDK({
	resource: new Resource({
		[ATTR_SERVICE_NAME]: 'basalt-example-app',
	}),
	spanProcessors: [
		new BatchSpanProcessor(new ConsoleSpanExporter()),
	],
})

// Start OpenTelemetry
otelSdk.start()
console.log('OpenTelemetry initialized')

// ============================================================================
// 2. Initialize Basalt SDK
// ============================================================================

const basalt = new Basalt({
	apiKey: process.env.BASALT_API_KEY || 'your-api-key-here',
	logLevel: 'warning',
})

// ============================================================================
// 3. Example: Basic Prompt Retrieval with Tracing
// ============================================================================

async function example1_BasicPromptGet() {
	console.log('\n=== Example 1: Basic Prompt Retrieval ===')

	const result = await basalt.prompt.get('weather-qa', {
		version: '1.0',
		variables: { location: 'Paris' },
	})

	if (result.error) {
		console.error('Error:', result.error.message)
		return
	}

	console.log('Prompt retrieved:', result.value.text)
	console.log('Check your traces for span: basalt.prompt.get')
}

// ============================================================================
// 4. Example: Using Context Propagation
// ============================================================================

async function example2_WithContext() {
	console.log('\n=== Example 2: Context Propagation ===')

	// Simulate a user request
	const userId = 'user-123'
	const orgId = 'org-456'
	const sessionId = 'session-abc'

	// Set Basalt context
	await BasaltContextManager.withContext(
		{
			user: { id: userId, name: 'John Doe' },
			organization: { id: orgId, name: 'Acme Corp' },
			featureSlug: 'user-onboarding',
			metadata: {
				sessionId: sessionId,
				environment: 'development',
				region: 'us-east-1',
			},
		},
		async () => {
			// All operations in this scope will have context attributes
			const result = await basalt.prompt.get('welcome-message', {
				variables: { userName: 'John' },
			})

			if (result.value) {
				console.log('Prompt text:', result.value.text)
				console.log(
					'Context attributes added to span:',
					'\n  - basalt.user.id = user-123',
					'\n  - basalt.organization.id = org-456',
					'\n  - basalt.span.feature_slug = user-onboarding',
					'\n  - basalt.meta.sessionId = session-abc',
				)
			}
		},
	)
}

// ============================================================================
// 5. Example: Multiple Operations with Cache Tracking
// ============================================================================

async function example3_CacheTracking() {
	console.log('\n=== Example 3: Cache Tracking ===')

	// First call - will hit the API
	console.log('First call (should miss cache):')
	const result1 = await basalt.prompt.get('weather-qa')
	console.log('Result:', result1.value ? 'Success' : 'Error')

	// Second call - will hit the cache
	console.log('\nSecond call (should hit cache):')
	const result2 = await basalt.prompt.get('weather-qa')
	console.log('Result:', result2.value ? 'Success' : 'Error')

	console.log(
		'\nCheck your traces:',
		'\n  - First call: basalt.cache.hit = false',
		'\n  - Second call: basalt.cache.hit = true, basalt.cache.type = query',
	)
}

// ============================================================================
// 6. Example: Dataset Operations
// ============================================================================

async function example4_DatasetOperations() {
	console.log('\n=== Example 4: Dataset Operations ===')

	// List datasets
	const listResult = await basalt.dataset.list()
	if (listResult.value) {
		console.log(`Found ${listResult.value.length} datasets`)
	}

	// Get specific dataset
	const getResult = await basalt.dataset.get('my-dataset')
	if (getResult.value) {
		console.log('Dataset retrieved:', getResult.value.slug)
	}

	// Add row to dataset
	const addResult = await basalt.dataset.addRow('my-dataset', {
		name: 'Test Row',
		values: { input: 'test', output: 'result' },
		metadata: { source: 'opentelemetry-example' },
	})

	if (addResult.value) {
		console.log('Row added to dataset')
	}

	console.log(
		'\nCheck your traces:',
		'\n  - basalt.dataset.list span',
		'\n  - basalt.dataset.get span (with cache tracking)',
		'\n  - basalt.dataset.addRow span',
	)
}

// ============================================================================
// 7. Example: Experiment Creation
// ============================================================================

async function example5_ExperimentCreation() {
	console.log('\n=== Example 5: Experiment Creation ===')

	const result = await basalt.monitor.createExperiment('checkout-flow', {
		name: 'A/B Test: New Checkout',
	})

	if (result.error) {
		console.error('Failed to create experiment:', result.error.message)
		return
	}

	console.log('Experiment created:', result.value.id)
	console.log(
		'\nCheck your traces:',
		'\n  - basalt.experiment.create span',
		'\n  - basalt.experiment.id attribute =', result.value.id,
	)
}

// ============================================================================
// 8. Example: Error Handling
// ============================================================================

async function example6_ErrorHandling() {
	console.log('\n=== Example 6: Error Handling ===')

	// Try to get non-existent prompt
	const result = await basalt.prompt.get('non-existent-prompt')

	if (result.error) {
		console.log('Expected error:', result.error.message)
		console.log(
			'\nCheck your traces:',
			'\n  - Span has error status',
			'\n  - error.type and error.message attributes',
			'\n  - basalt.request.success = false',
		)
	}
}

// ============================================================================
// 9. Example: Nested Operations
// ============================================================================

async function example7_NestedOperations() {
	console.log('\n=== Example 7: Nested Operations ===')

	await BasaltContextManager.withContext(
		{
			user: { id: 'user-789' },
			featureSlug: 'multi-step-flow',
		},
		async () => {
			// These operations will be nested under the same context
			const prompt1 = await basalt.prompt.get('step-1-prompt')
			const prompt2 = await basalt.prompt.get('step-2-prompt')
			const datasets = await basalt.dataset.list()

			console.log('Completed nested operations')
			console.log(
				'\nCheck your traces:',
				'\n  - All spans share the same trace ID',
				'\n  - All spans have basalt.span.feature_slug = multi-step-flow',
				'\n  - Spans show parent-child relationships',
			)
		},
	)
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
	console.log('Starting Basalt SDK + OpenTelemetry Examples')
	console.log('==============================================\n')

	try {
		await example1_BasicPromptGet()
		await example2_WithContext()
		await example3_CacheTracking()
		await example4_DatasetOperations()
		await example5_ExperimentCreation()
		await example6_ErrorHandling()
		await example7_NestedOperations()

		console.log('\n==============================================')
		console.log('All examples completed!')
		console.log(
			'\nLook at the console output above to see the spans created.',
		)
		console.log('In production, configure a real exporter (Jaeger, Zipkin, etc.)')
	} catch (error) {
		console.error('Example failed:', error)
	} finally {
		// Shutdown OpenTelemetry gracefully
		await otelSdk.shutdown()
		console.log('\nOpenTelemetry shutdown complete')
	}
}

// Run if executed directly
if (require.main === module) {
	main().catch(console.error)
}
