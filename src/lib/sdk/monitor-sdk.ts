// import Generation from '../objects/generation'
import SendTraceEndpoint from '../endpoints/monitor/send-trace'
import Generation from '../objects/generation'
import Span from '../objects/span'
import { ITraceMonitor, Trace, monitorSDKSymbol } from '../objects/trace'
import { GenerationParams, SpanParams } from '../resources'
import type { IApi, IEndpoint, ILogger } from '../resources/contract'
import { IMonitorSDK } from '../resources/monitor/monitor.types'
import { TraceParams } from '../resources/monitor/trace.types'

export default class MonitorSDK implements IMonitorSDK, ITraceMonitor {
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
		return this._createTrace(slug, params)
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
	public async flushTrace(trace: Trace): Promise<void> {
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
				decodeResponse: (body: unknown): { error: null; value: { id: string } } => {
					if (typeof body !== 'object' || body === null) {
						return { error: null, value: { id: '' } };
					}
					const { id } = body as { id: string };
					return { error: null, value: { id } };
				}
			} as IEndpoint<{ trace: Trace }, { id: string }>;

			// this.logger.warn('endpoint', endpoint)

			const result = await this.api.invoke(endpoint, { trace });
			
			if (result.error) {
				this.logger.warn('Failed to flush trace', { 
					error: result.error,
					traceSlug: trace.featureSlug
				});
				return;
			}
			
			this.logger.warn('Successfully flushed trace', { 
				traceId: result.value.id,
				traceSlug: trace.featureSlug
			});
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
		
		// Store a reference to the SDK in the trace for flushing
		// Using the exported symbol to avoid property name collisions
		// Use type assertion to safely set the symbol property
		const traceWithSymbol = trace as unknown as Record<symbol, unknown>;
		traceWithSymbol[monitorSDKSymbol] = this;
		
		// Override the end method to automatically flush the trace
		const originalEnd = trace.end.bind(trace);
		const boundFlushTrace = this.flushTrace.bind(this);
		
		// Use an arrow function to avoid 'this' binding issues
		trace.end = (output?: string): Trace => {
			// Call the original end method
			const result = originalEnd(output);
			console.log('end trace called', result)

			// Flush the trace to the API
			boundFlushTrace(trace).catch((error: unknown) => {
				this.logger.warn('Failed to auto-flush trace on end', {
					error,
					traceSlug: trace.featureSlug
				});
			});

			return result;
		};

		return trace;
	}

	private _createGeneration(params: GenerationParams) {
		return new Generation(params);
	}

	private _createSpan(params: SpanParams) {
		return new Span(params);
	}
}