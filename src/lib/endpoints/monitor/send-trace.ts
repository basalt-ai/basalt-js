import { Trace, isGeneration } from '../../resources'
import type {
	ErrObj, FetchMethod, QueryParamsObject, Result,
} from '../../resources/contract'
import { err, ok } from '../../utils/utils'

export interface Input {
	trace: Trace
}

/**
 * Endpoint for sending a trace to the API
 */
export default class SendTraceEndpoint {
	/**
	 * Prepares the request for sending a trace
	 * @param dto - The trace to send
	 * @returns The request information
	 */
	static prepareRequest(dto: Input): {
		path: string
		method: FetchMethod
		body?: BodyInit
		query?: QueryParamsObject
	} {
		const { trace } = dto

		// Convert logs to a format suitable for the API
		const logs = trace.logs.map(log => ({
			id: log.id,
			type: log.type,
			name: log.name,
			startTime: log.startTime instanceof Date ? log.startTime.toISOString() : log.startTime,
			endTime: log.endTime instanceof Date ? log.endTime.toISOString() : log.endTime,
			metadata: log.metadata,
			parentId: log.parent?.id,
			input: 'input' in log ? log.input : undefined,
			output: 'output' in log ? log.output : undefined,
			idealOutput: 'idealOutput' in log ? log.idealOutput : undefined,
			prompt: isGeneration(log) && 'prompt' in log ? log.prompt : undefined,
			inputTokens: isGeneration(log) && 'inputTokens' in log ? log.inputTokens : undefined,
			outputTokens: isGeneration(log) && 'outputTokens' in log ? log.outputTokens : undefined,
			cost: isGeneration(log) && 'cost' in log ? log.cost : undefined,
			variables: isGeneration(log) && 'variables' in log
				? Object.entries(log.variables ?? {})
						.map(([key, value]) => ({ label: key, value }))
				: [],
			evaluators: log.evaluators,
		}))

		// Convert the body to a JSON string to match BodyInit type
		const body = JSON.stringify({
			name: trace.name,
			featureSlug: 'featureSlug' in trace ? trace.featureSlug : undefined,
			experiment: trace.experiment
				? { id: trace.experiment.id }
				: undefined,
			input: trace.input,
			output: trace.output,
			metadata: trace.metadata,
			organization: trace.organization,
			user: trace.user,
			startTime: trace.startTime instanceof Date ? trace.startTime.toISOString() : trace.startTime,
			endTime: trace.endTime instanceof Date ? trace.endTime.toISOString() : trace.endTime,
			logs,
			idealOutput: trace.idealOutput,
			evaluators: trace.evaluators,
			evaluationConfig: trace.evaluationConfig,
		})

		return {
			method: 'post',
			path: '/monitor/trace',
			body,
		}
	}

	/**
	 * Decodes the response from sending a trace
	 * @param body - The response from the API
	 * @returns The decoded response
	 */
	static decodeResponse(body: unknown): Result<undefined, ErrObj> {
		if (typeof body !== 'object' || body === null) {
			return err({ message: 'Failed to decode response (invalid body format)' })
		}

		return ok(undefined)
	}
}
