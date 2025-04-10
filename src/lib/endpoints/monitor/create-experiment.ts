import { Experiment } from '../../objects/experiment'
import type { FetchMethod, QueryParamsObject, Result } from '../../resources/contract'
import { err, ok } from '../../utils/utils'

export interface Input {
	featureSlug: string
	name: string
}

export interface Output {
	experiment: Experiment
}

/**
 * Endpoint for creating an experiment
 */
export default class CreateExperimentEndpoint {
	/**
	 * Prepares the request for creating an experiment
	 * @param dto - The experiment data
	 * @returns The request information
	 */
	static prepareRequest(dto: Input): {
		path: string
		method: FetchMethod
		body?: BodyInit
		query?: QueryParamsObject
	} {
		const { featureSlug, name } = dto

		// Convert the body to a JSON string to match BodyInit type
		const body = JSON.stringify({
			featureSlug,
			name,
		})

		return {
			method: 'post',
			path: '/monitor/experiments',
			body,
		}
	}

	/**
	 * Decodes the response from creating an experiment
	 * @param body - The response from the API
	 * @returns The decoded response
	 */
	static decodeResponse(body: unknown): Result<Output> {
		if (typeof body !== 'object' || body === null) {
			return err({ message: 'Failed to decode response (invalid body format)' })
		}

		return ok({ experiment: new Experiment(body as Experiment) })
	}
}
