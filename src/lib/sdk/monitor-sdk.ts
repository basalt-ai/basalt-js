import SendTraceEndpoint from '../endpoints/monitor/send-trace'
import Generation from '../objects/generation'
import Span from '../objects/span'
import { Trace } from '../objects/trace'
import { GenerationParams, SpanParams } from '../resources'
import type { IApi, ILogger } from '../resources/contract'
import { IMonitorSDK } from '../resources/monitor/monitor.types'
import { TraceParams } from '../resources/monitor/trace.types'

export default class MonitorSDK implements IMonitorSDK {
	/**
	 * @param api - The API interface for making requests.
	 * @param logger - The logger interface for logging information.
	 */
	constructor(
		private readonly api: IApi,
		private readonly logger: ILogger
	) {}

	// --
	// Public methods
	// --

	public createTrace(slug: string, params: TraceParams = {}): Trace {
		const trace = this._createTrace(slug, params)
		trace._sdk = this
		return trace
	}

	public createGeneration(params: GenerationParams) {
		return this._createGeneration(params)
	}

	public createSpan(params: SpanParams) {
		return this._createSpan(params)
	}

	/**
	 * Flushes a trace and all its associated data to the API.
	 * 
	 * @param trace - The trace to flush to the API
	 * @returns A promise that resolves when the trace has been successfully sent
	 */
	public async flush(trace: Trace): Promise<void> {
		try {
			if (!this.api) {
				this.logger.warn('No API instance available to flush trace', {
					traceSlug: trace.featureSlug
				});
				return;
			}

			// Create an instance of the endpoint to use its decodeResponse method
			const endpoint = {
				prepareRequest: () => SendTraceEndpoint.prepareRequest({ trace }),
				// Use an arrow function to avoid 'this' binding issues
				decodeResponse: (body: unknown) => SendTraceEndpoint.decodeResponse(body)
			};

			const result = await this.api.invoke(endpoint, { trace });
			
			if (result.error) {
				this.logger.warn('Failed to flush trace', { 
					error: result.error,
					traceSlug: trace.featureSlug
				});
				return;
			}
			
			this.logger.warn('Successfully flushed trace', { 
				traceSlug: trace.featureSlug
			});

			return result.value
		} catch (error) {
			this.logger.warn('Exception while flushing trace', { 
				error,
				traceSlug: trace.featureSlug
			});
		}
	}

	// --
	// Private methods
	// --

	private _createTrace(slug: string, params: TraceParams = {}): Trace {
		const trace = new Trace(slug, params);
		
		return trace;
	}

	private _createGeneration(params: GenerationParams) {
		return new Generation(params);
	}

	private _createSpan(params: SpanParams) {
		return new Span(params);
	}
}