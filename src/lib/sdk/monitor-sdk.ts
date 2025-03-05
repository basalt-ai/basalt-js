import Generation from '../objects/generation'
import Span from '../objects/span'
import { Trace } from '../objects/trace'
import { GenerationParams, SpanParams } from '../resources'
import type { IApi, ILogger } from '../resources/contract'
import { IMonitorSDK } from '../resources/monitor/monitor.types'
import { TraceParams } from '../resources/monitor/trace.types'
import Flusher from '../utils/flusher'
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

	public createTrace(slug: string, params: TraceParams = {}) {
		const trace = this._createTrace(slug, params)
		return trace
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

	private _createTrace(slug: string, params: TraceParams = {}) {
		const flusher = new Flusher(this.api, this.logger)
		const trace = new Trace(slug, params, flusher)

		return trace;
	}

	private _createGeneration(params: GenerationParams) {
		return new Generation(params);
	}

	private _createSpan(params: SpanParams) {
		return new Span(params);
	}
}