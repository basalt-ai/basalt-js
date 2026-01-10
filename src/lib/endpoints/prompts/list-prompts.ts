import type { PromptListResponse, Result } from "../../resources";
import { err, ok } from "../../utils/utils";

interface Input {
	featureSlug?: string;
}

interface Output {
	warning?: string;
	prompts: PromptListResponse[];
}

export default class ListPromptsEndpoint {
	static prepareRequest(dto?: Input) {
		return {
			path: "/prompts",
			query: {
				featureSlug: dto?.featureSlug,
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
			!("prompts" in body) ||
			typeof body.prompts !== "object" ||
			body.prompts === null
		) {
			return err({
				message: "Get Prompt: Failed to decode response (missing prompt)",
			});
		}

		return ok({
			prompts: body.prompts as PromptListResponse[],
		});
	}
}
