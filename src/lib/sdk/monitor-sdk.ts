import CreateExperimentEndpoint from '../endpoints/monitor/create-experiment'
import { Experiment } from '../objects/experiment'
import Generation from '../objects/generation'
import Log from '../objects/log'
import { Trace } from '../objects/trace'
import { GenerationParams, LogParams } from '../resources'
import type { AsyncResult, IApi, Logger } from '../resources/contract'
import { ExperimentParams } from '../resources/monitor/experiment.types'
import { IMonitorSDK } from '../resources/monitor/monitor.types'
import { TraceParams } from '../resources/monitor/trace.types'
import { withBasaltSpan } from '../telemetry'
import { BASALT_ATTRIBUTES } from '../telemetry/attributes'
import Flusher from '../utils/flusher'
import { ok } from '../utils/utils'
import { err } from '../utils/utils'
export default class MonitorSDK implements IMonitorSDK {
	/**
	 * @param api - The API interface for making requests.
	 * @param logger - The logger interface for logging information.
	 */
	constructor(
		private readonly api: IApi,
		private readonly logger: Logger,
	) {}

	// --
	// Public methods
	// --

	/**
	 * Creates a new experiment for monitoring.
	 *
	 * @param params - Parameters for the experiment.
	 * @returns A new Experiment instance.
	 */
	public async createExperiment(featureSlug: string, params: ExperimentParams): AsyncResult<Experiment> {
		return withBasaltSpan(
			'@basalt-ai/sdk',
			'basalt.experiment.create',
			{
				[BASALT_ATTRIBUTES.OPERATION]: 'create',
				[BASALT_ATTRIBUTES.EXPERIMENT_FEATURE_SLUG]: featureSlug,
				[BASALT_ATTRIBUTES.EXPERIMENT_NAME]: params.name,
			},
			async (span) => {
				const result = await this.api.invoke(CreateExperimentEndpoint, { featureSlug, ...params })

				if (result.error) {
					return err(result.error)
				}

				// Add experiment ID after creation
				span.setAttribute(BASALT_ATTRIBUTES.EXPERIMENT_ID, result.value.experiment.id)
				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true)

				return ok(result.value.experiment)
			},
		)
	}

	/**
	 * Creates a new trace for monitoring.
	 *
	 * @param featureSlug - The unique identifier of the feature.
	 * @param params - Optional parameters for the trace.
	 * @returns A new Trace instance.
	 */
	public createTrace(featureSlug: string, params: TraceParams = {}) {
		const trace = this._createTrace(featureSlug, params)
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
	 * @param featureSlug - The unique identifier of the feature.
	 * @param params - Optional parameters for the trace.
	 * @returns A new Trace instance.
	 */
	private _createTrace(featureSlug: string, params: TraceParams = {}) {
		const flusher = new Flusher(this.api, this.logger)
		const trace = new Trace(featureSlug, params, flusher, this.logger)

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
