// import Generation from '../objects/generation'
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
		return this._createTrace(slug, params)
	}

	public createGeneration(params: GenerationParams) {
		return this._createGeneration(params)
	}

	public createSpan(params: SpanParams) {
		return this._createSpan(params)
	}
	// --
	// Private methods
	// --

	private _createTrace(slug: string, params: TraceParams = {}): Promise<Trace> {
		const trace = new Trace(slug, params)

		// Override the end method to send the trace to the API
		const originalEnd = trace.end.bind(trace)
		trace.end = async (output?: string) => {
			// Call the original end method
			const result = originalEnd(output)

			// Send the trace to the API if we have an API instance
			if (this.api) {
				 
				await this.api.invoke(new SendTraceEndpoint(), { trace })
			}

			return result
		}

		return Promise.resolve(trace)
	}

	private _createGeneration(params: GenerationParams) {
		return new Generation(params)
	}

	private _createSpan(params: SpanParams) {
		return new Span(params)
	}
}