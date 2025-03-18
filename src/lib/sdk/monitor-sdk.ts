import Generation from '../objects/generation'
import Log from '../objects/log'
import { Trace } from '../objects/trace'
import { GenerationParams, LogParams } from '../resources'
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
		private readonly logger: ILogger,
	) {}

	// --
	// Public methods
	// --

	/**
	 * Creates a new trace for monitoring.
	 *
	 * @param slug - The unique identifier for the trace.
	 * @param params - Optional parameters for the trace.
	 * @returns A new Trace instance.
	 */
	public createTrace(slug: string, params: TraceParams = {}) {
		const trace = this._createTrace(slug, params)
		return trace
	}

	/**
	 * Creates a new generation for monitoring.
	 *
	 * @param params - Parameters for the generation.
	 * @returns A new Generation instance.
	 */
	public createGeneration(params: GenerationParams) {
		return this._createGeneration(params)
	}

	/**
	 * Creates a new log for monitoring.
	 *
	 * @param params - Parameters for the log.
	 * @returns A new Log instance.
	 */
	public createLog(params: LogParams) {
		return this._createLog(params)
	}

	// --
	// Private methods
	// --

	/**
	 * Internal implementation for creating a trace.
	 *
	 * @param slug - The unique identifier for the trace.
	 * @param params - Optional parameters for the trace.
	 * @returns A new Trace instance.
	 */
	private _createTrace(slug: string, params: TraceParams = {}) {
		const flusher = new Flusher(this.api, this.logger)
		const trace = new Trace(slug, params, flusher)

		return trace
	}

	/**
	 * Internal implementation for creating a generation.
	 *
	 * @param params - Parameters for the generation.
	 * @returns A new Generation instance.
	 */
	private _createGeneration(params: GenerationParams) {
		return new Generation(params)
	}

	/**
	 * Internal implementation for creating a log.
	 *
	 * @param params - Parameters for the log.
	 * @returns A new Log instance.
	 */
	private _createLog(params: LogParams) {
		return new Log(params)
	}
}
