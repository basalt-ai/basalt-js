import type { PromptListResponse, Result } from '../../ressources'
import { err, ok } from '../../utils/utils'

interface Output {
	warning?: string;
	prompts: PromptListResponse[];
}

export default class ListPromptsEndpoint {
	static prepareRequest() {
		return {
			path: '/prompts',
			method: 'get'
		} as const
	}

	static decodeResponse(body: unknown): Result<Output> {
		if (
			body === null
			|| typeof body !== 'object'
		) {
			return err({ message: 'Get Prompt: Failed to decode response (invalid body format)' })
		}

		if (!('prompts' in body) || typeof body.prompts !== 'object' || body.prompts === null) {
			return err({ message: 'Get Prompt: Failed to decode response (missing prompt)' })
		}


		return ok({
			prompts: body.prompts as PromptListResponse[]
		})
	}
}
