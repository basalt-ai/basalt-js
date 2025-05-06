import { calculateLatency, recordMetrics } from './telemetry'

import SendTraceEndpoint from '../endpoints/monitor/send-trace'
import { Trace, isGeneration } from '../resources'
import { IApi, Logger } from '../resources/contract'

export default class Flusher {
	constructor(
		private readonly api: IApi,
		private readonly logger: Logger,
	) {}

	/**
	 * Flushes a trace and all its associated data to the API.
	 *
	 * @param trace - The trace to flush to the API
	 * @returns A promise that resolves when the trace has been successfully sent
	 */
	public async flushTrace(trace: Trace): Promise<void> {
		try {
			if (!this.api) {
				console.warn('Cannot flush trace: no API instance available')
				return
			}

			// Record telemetry metrics for all logs in the trace
			this.recordTraceMetrics(trace)

			// Create an instance of the endpoint to use its decodeResponse method
			const endpoint = {
				prepareRequest: () => SendTraceEndpoint.prepareRequest({ trace }),
				// Use an arrow function to avoid 'this' binding issues
				decodeResponse: (body: unknown) => SendTraceEndpoint.decodeResponse(body),
			}

			const result = await this.api.invoke(endpoint, { trace })

			if (result.error) {
				this.logger.error('Failed to flush trace', {
					error: result.error,
					featureSlug: trace.featureSlug,
				})
				return
			}
		}
		catch (error) {
			this.logger.error('Exception while flushing trace', {
				error,
				featureSlug: trace.featureSlug,
			})
		}
	}

	/**
	 * Records telemetry metrics for a trace and all its logs.
	 *
	 * @param trace - The trace to record metrics for
	 */
	private recordTraceMetrics(trace: Trace): void {
		// Record metrics for each generation log in the trace
		trace.logs.forEach((log) => {
			const startTime = typeof log.startTime === 'string' ? new Date(log.startTime) : log.startTime
			const endTime = typeof log.endTime === 'string' ? new Date(log.endTime) : log.endTime
			recordMetrics({
				cost: isGeneration(log) ? log.cost : undefined,
				latency: calculateLatency(startTime, endTime),
				inputTokens: isGeneration(log) ? log.inputTokens : undefined,
				outputTokens: isGeneration(log) ? log.outputTokens : undefined,
				featureSlug: 'featureSlug' in trace ? trace.featureSlug : undefined,
				organizationId: trace.organization?.id,
				organizationName: trace.organization?.name,
				userId: trace.user?.id,
				userName: trace.user?.name,
			})
		})

		// Record overall trace metrics
		recordMetrics({
			latency: calculateLatency(trace.startTime, trace.endTime),
			featureSlug: trace.featureSlug,
			organizationId: trace.organization?.id,
			organizationName: trace.organization?.name,
			userId: trace.user?.id,
			userName: trace.user?.name,
		})
	}
}
