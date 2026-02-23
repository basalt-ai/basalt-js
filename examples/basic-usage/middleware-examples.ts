/**
 * Examples of using startObserve() with popular Node.js frameworks
 * 
 * These examples demonstrate plug-and-play tracing at application entry points
 * with automatic context propagation to nested operations.
 */

import { startObserve } from '@basalt-ai/sdk'

// ============================================================================
// Express.js Middleware Example
// ============================================================================

/**
 * Express middleware for automatic root span creation
 * 
 * Usage:
 * ```typescript
 * import express from 'express'
 * import { basaltTracing } from './middleware-examples'
 * 
 * const app = express()
 * app.use(basaltTracing())
 * ```
 */
export function expressBasaltTracing() {
	return (req: any, res: any, next: any) => {
		// Create root span for this request
		const rootSpan = startObserve({
			name: `${req.method} ${req.path}`,
			attributes: {
				'http.method': req.method,
				'http.path': req.path,
				'http.url': req.originalUrl,
			},
		})

		// Extract identity from headers if available
		const userId = req.headers['x-user-id'] as string | undefined
		const orgId = req.headers['x-organization-id'] as string | undefined

		if (userId || orgId) {
			rootSpan.setIdentity({
				userId,
				organizationId: orgId,
			})
		}

		// Extract experiment ID from headers if available
		const experimentId = req.headers['x-experiment-id'] as string | undefined
		if (experimentId) {
			rootSpan.setExperiment(experimentId)
		}

		// End span when response finishes
		res.on('finish', () => {
			rootSpan.setAttribute('http.status_code', res.statusCode)
			rootSpan.end()
		})

		// Handle errors
		res.on('error', (error: Error) => {
			rootSpan.recordException(error)
			rootSpan.end()
		})

		next()
	}
}

// ============================================================================
// Fastify Plugin Example
// ============================================================================

/**
 * Fastify plugin for automatic root span creation
 * 
 * Usage:
 * ```typescript
 * import Fastify from 'fastify'
 * import { fastifyBasaltPlugin } from './middleware-examples'
 * 
 * const fastify = Fastify()
 * fastify.register(fastifyBasaltPlugin)
 * ```
 */
export function fastifyBasaltPlugin(fastify: any, opts: any, done: () => void) {
	// Hook before request processing
	fastify.addHook('onRequest', async (request: any, reply: any) => {
		// Create root span for this request
		const rootSpan = startObserve({
			name: `${request.method} ${request.routerPath || request.url}`,
			attributes: {
				'http.method': request.method,
				'http.url': request.url,
			},
		})

		// Extract identity from headers
		const userId = request.headers['x-user-id']
		const orgId = request.headers['x-organization-id']

		if (userId || orgId) {
			rootSpan.setIdentity({
				userId,
				organizationId: orgId,
			})
		}

		// Store span on request for access in handlers
		request.rootSpan = rootSpan
	})

	// Hook after response is sent
	fastify.addHook('onResponse', async (request: any, reply: any) => {
		if (request.rootSpan) {
			request.rootSpan.setAttribute('http.status_code', reply.statusCode)
			request.rootSpan.end()
		}
	})

	// Hook on error
	fastify.addHook('onError', async (request: any, reply: any, error: Error) => {
		if (request.rootSpan) {
			request.rootSpan.recordException(error)
		}
	})

	done()
}

// ============================================================================
// Standalone Script Example
// ============================================================================

/**
 * Example of using startObserve() in a standalone script or CLI tool
 */
export async function exampleStandaloneScript() {
	// Create root span for the entire script execution
	const rootSpan = startObserve({
		name: 'data-processing-job',
		attributes: {
			'job.type': 'batch',
			'job.environment': process.env.NODE_ENV || 'development',
		},
	})

	// Set experiment if this is an A/B test
	rootSpan.setExperiment('data-pipeline-v2')

	// Set identity for the job runner
	rootSpan.setIdentity({
		userId: 'system',
		jobId: process.env.JOB_ID || 'manual',
	})

	try {
		// Your business logic here
		// All nested SDK calls will automatically be part of this trace
		console.log('Processing data...')

		// Simulate work
		await new Promise(resolve => setTimeout(resolve, 1000))

		console.log('Done!')
	} catch (error) {
		rootSpan.recordException(error as Error)
		throw error
	} finally {
		// Always end the root span
		rootSpan.end()
	}
}

// ============================================================================
// AWS Lambda Handler Example
// ============================================================================

/**
 * Example of wrapping an AWS Lambda handler with root span
 */
export function withBasaltObservability<TEvent = any, TResult = any>(
	handler: (event: TEvent, context: any) => Promise<TResult>
) {
	return async (event: TEvent, context: any): Promise<TResult> => {
		const rootSpan = startObserve({
			name: context.functionName || 'lambda-handler',
			attributes: {
				'faas.name': context.functionName,
				'faas.id': context.invokedFunctionArn,
				'faas.execution': context.awsRequestId,
			},
		})

		// Extract identity from event if available
		if (event && typeof event === 'object') {
			const eventObj = event as any
			if (eventObj.requestContext?.authorizer) {
				rootSpan.setIdentity({
					userId: eventObj.requestContext.authorizer.principalId,
				})
			}
		}

		try {
			const result = await handler(event, context)
			return result
		} catch (error) {
			rootSpan.recordException(error as Error)
			throw error
		} finally {
			rootSpan.end()
		}
	}
}

// ============================================================================
// Generic Async Operation Wrapper Example
// ============================================================================

/**
 * Generic wrapper for any async operation that needs observability
 * 
 * Usage:
 * ```typescript
 * await observeOperation('user-registration', async () => {
 *   await createUser(data)
 *   await sendWelcomeEmail(user)
 * })
 * ```
 */
export async function observeOperation<T>(
	name: string,
	fn: () => Promise<T>,
	options?: {
		attributes?: Record<string, unknown>
		identity?: { userId?: string; organizationId?: string }
		experimentId?: string
	}
): Promise<T> {
	const rootSpan = startObserve({
		name,
		attributes: options?.attributes,
	})

	if (options?.identity) {
		rootSpan.setIdentity(options.identity)
	}

	if (options?.experimentId) {
		rootSpan.setExperiment(options.experimentId)
	}

	try {
		return await fn()
	} catch (error) {
		rootSpan.recordException(error as Error)
		throw error
	} finally {
		rootSpan.end()
	}
}
