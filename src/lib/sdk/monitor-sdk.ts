import CreateExperimentEndpoint from "../endpoints/monitor/create-experiment";
import type { Experiment } from "../objects/experiment";
import type { AsyncResult, IApi, Logger } from "../resources/contract";
import type { ExperimentParams } from "../resources/monitor/experiment.types";
import type { IMonitorSDK } from "../resources/monitor/monitor.types";
import { withBasaltSpan } from "../telemetry";
import { BASALT_ATTRIBUTES } from "../telemetry/attributes";
import { err, ok } from "../utils/utils";
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
	public async createExperiment(
		featureSlug: string,
		params: ExperimentParams & {
			kind?: import("../telemetry/types").ObserveKind;
		},
	): AsyncResult<Experiment> {
		return withBasaltSpan(
			"@basalt-ai/sdk",
			"basalt.experiment.create",
			{
				kind: params.kind,
				[BASALT_ATTRIBUTES.METADATA]: JSON.stringify({
					"basalt.api.client": "experiments",
					"basalt.api.operation": "create",
					"basalt.internal.api": true,
					"basalt.experiment.feature_slug": featureSlug,
					"basalt.experiment.name": params.name,
				}),
			},
			async (span) => {
				// Capture input
				span.setInput({
					featureSlug,
					...params,
				});

				const result = await this.api.invoke(CreateExperimentEndpoint, {
					featureSlug,
					...params,
				});

				if (result.error) {
					// Capture error
					span.setOutput({ error: result.error.message });
					return err(result.error);
				}

				// Add experiment ID after creation
				span.setAttribute(
					BASALT_ATTRIBUTES.EXPERIMENT_ID,
					result.value.experiment.id,
				);
				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);

				// Capture output
				span.setOutput(result.value.experiment);

				return ok(result.value.experiment);
			},
		);
	}
}
