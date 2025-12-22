import type { PromptModel, Result } from '../../resources'
import { err, ok } from '../../utils/utils'

interface Input {
	slug: string
	version?: string
	tag?: string
}

interface Output {
	warning?: string

	prompt: {
		// At this level, the prompt is a "raw" string
		// that still include the variables ex: "Greet {name}"
		text: string
		systemText: string | undefined
		model: PromptModel
	}

}

export default class GetPromptEndpoint {
	static prepareRequest(dto: Input) {
		return {
			path: `/prompts/${dto.slug}`,
			query: {
				version: dto.version,
				tag: dto.tag,
			},
			method: 'get' as const,
		}
	}

	static decodeResponse(body: unknown): Result<Output> {
		if (
			body === null
			|| typeof body !== 'object'
		) {
			return err({ message: 'Get Prompt: Failed to decode response (invalid body format)' })
		}

		if (!('prompt' in body) || typeof body.prompt !== 'object' || body.prompt === null) {
			return err({ message: 'Get Prompt: Failed to decode response (missing prompt)' })
		}

		if (!('text' in body.prompt) || typeof body.prompt.text !== 'string') {
			return err({ message: 'Get Prompt: Failed to decode response (missing prompt.text)' })
		}

		if (!('version' in body.prompt) || typeof body.prompt.version !== 'string') {
			return err({ message: 'Get Prompt: Failed to decode response (missing prompt.version)' })
		}

		if (!('systemText' in body.prompt)
			|| (typeof body.prompt.systemText !== 'string' && body.prompt.systemText !== undefined)
		) {
			return err({ message: 'Get Prompt: Failed to decode response (missing prompt.systemText)' })
		}

		if (
			!('model' in body.prompt)
			|| typeof body.prompt.model !== 'object'
			|| body.prompt.model === null
		) {
			return err({ message: 'Get Prompt: Failed to decode response (missing prompt.model)' })
		}

		const warning = 'warning' in body && typeof body.warning === 'string'
			? body.warning
			: undefined

		return ok({
			warning,

			prompt: {
				text: body.prompt.text,
				model: body.prompt.model as PromptModel,
				systemText: body.prompt.systemText as string | undefined,
				version: body.prompt.version,
			},
		})
	}
}
