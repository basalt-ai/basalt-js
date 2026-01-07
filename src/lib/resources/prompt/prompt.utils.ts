import type { BasePromptModel, PromptResponse } from "./prompt.types";

export type UniversalChatMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export type ProviderModel = Pick<BasePromptModel, "provider" | "model">;

/**
 * Resolve the provider and model from a Basalt prompt.
 * Optionally override with per-provider defaults if missing.
 */
export function resolveProviderModel(
	prompt: Pick<PromptResponse, "model">,
	options?: { defaults?: Partial<Record<BasePromptModel["provider"], string>> },
): ProviderModel {
	const { provider, model } = prompt.model;

	if (model && model.trim().length > 0) {
		return { provider, model };
	}

	const fallback = options?.defaults?.[provider];
	return { provider, model: fallback ?? "gpt-4o" };
}

/**
 * Build a provider-agnostic chat message array from a Basalt prompt.
 * Returns [system?, user] where system is included when non-empty.
 */
export function buildChatMessages(
	prompt: Pick<PromptResponse, "text" | "systemText">,
): UniversalChatMessage[] {
	const messages: UniversalChatMessage[] = [];

	const system = prompt.systemText?.trim();
	if (system) {
		messages.push({ role: "system", content: system });
	}

	const user = (prompt.text ?? "").toString().trim();
	if (user.length > 0) {
		messages.push({ role: "user", content: user });
	}

	return messages;
}
