import type { PromptResponse } from "../resources";

export type PromptContextMetadata = {
	slug: string;
	version?: string;
	tag?: string;
	variables?: Record<string, unknown>;
	fromCache: boolean;
};

const PROMPT_METADATA_KEY = Symbol.for("basalt.prompt.metadata");

export function attachPromptMetadata(
	prompt: PromptResponse,
	metadata: PromptContextMetadata,
): PromptResponse {
	if (!prompt || !metadata?.slug) {
		return prompt;
	}

	try {
		Object.defineProperty(prompt, PROMPT_METADATA_KEY, {
			value: metadata,
			enumerable: false,
			configurable: true,
			writable: true,
		});
    } catch {
        (prompt as unknown as Record<symbol, PromptContextMetadata | undefined>)[
            PROMPT_METADATA_KEY
        ] = metadata;
    }

	return prompt;
}

export function getPromptMetadata(
	prompt: PromptResponse,
): PromptContextMetadata | undefined {
	if (!prompt) {
		return undefined;
	}

    return (prompt as unknown as Record<symbol, PromptContextMetadata | undefined>)[
        PROMPT_METADATA_KEY
    ];
}
