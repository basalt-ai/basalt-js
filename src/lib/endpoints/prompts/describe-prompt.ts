import type { PromptDetailResponse, Result } from "../../resources";
import { err, ok } from "../../utils/utils";

interface Input {
	slug: string;
	version?: string;
	tag?: string;
}

interface Output {
	warning?: string;
	prompt: PromptDetailResponse;
}

export default class DescribePromptEndpoint {
	static prepareRequest(dto: Input) {
		return {
			path: `/prompts/${dto.slug}/describe`,
			query: {
				version: dto.version,
				tag: dto.tag,
			},
			method: "get",
		} as const;
	}

	static decodeResponse(body: unknown): Result<Output> {
		if (body === null || typeof body !== "object") {
			return err({
				message: "Get Prompt: Failed to decode response (invalid body format)",
			});
		}

		if (
			!("prompt" in body) ||
			typeof body.prompt !== "object" ||
			body.prompt === null
		) {
			return err({
				message: "Get Prompt: Failed to decode response (missing prompt)",
			});
		}

		const warning =
			"warning" in body && typeof body.warning === "string"
				? body.warning
				: undefined;

		return ok({
			warning,
			prompt: body.prompt as PromptDetailResponse,
		});
	}
}
