import {
	buildChatMessages,
	resolveProviderModel,
} from "../lib/resources/prompt";

describe("prompt utils", () => {
	describe("resolveProviderModel", () => {
		const base = {
			text: "",
			systemText: undefined as string | undefined,
		};

		it("returns provider/model from prompt", () => {
			const prompt = {
				...base,
				model: {
					provider: "open-ai" as const,
					model: "gpt-4o",
					version: "latest",
					parameters: {
						temperature: 0.7,
						topP: 1,
						maxLength: 1024,
						responseFormat: "text" as const,
					},
				},
			};

			const res = resolveProviderModel(prompt);
			expect(res).toEqual({ provider: "open-ai", model: "gpt-4o" });
		});

		it("falls back to per-provider default when model is empty", () => {
			const prompt = {
				...base,
				model: {
					provider: "anthropic" as const,
					model: "",
					version: "latest",
					parameters: {
						temperature: 0.7,
						topP: 1,
						maxLength: 1024,
						responseFormat: "text" as const,
					},
				},
			};

			const res = resolveProviderModel(prompt, {
				defaults: { anthropic: "3.5-sonnet" },
			});
			expect(res).toEqual({ provider: "anthropic", model: "3.5-sonnet" });
		});

		it("uses global default gpt-4o when nothing provided", () => {
			const prompt = {
				...base,
				model: {
					provider: "mistral" as const,
					model: "",
					version: "latest",
					parameters: {
						temperature: 0.7,
						topP: 1,
						maxLength: 1024,
						responseFormat: "text" as const,
					},
				},
			};

			const res = resolveProviderModel(prompt);
			expect(res).toEqual({ provider: "mistral", model: "gpt-4o" });
		});
	});

	describe("buildChatMessages", () => {
		it("returns [system, user] when both are present and non-empty", () => {
			const prompt = {
				text: "Hello",
				systemText: "Be helpful",
				model: {
					provider: "open-ai" as const,
					model: "gpt-4o",
					version: "latest",
					parameters: {
						temperature: 0.7,
						topP: 1,
						maxLength: 1024,
						responseFormat: "text" as const,
					},
				},
			};
			const messages = buildChatMessages(prompt);
			expect(messages).toEqual([
				{ role: "system", content: "Be helpful" },
				{ role: "user", content: "Hello" },
			]);
		});

		it("returns only user when systemText is empty/whitespace", () => {
			const prompt = {
				text: "Hi",
				systemText: "   ",
				model: {
					provider: "open-ai" as const,
					model: "gpt-4o",
					version: "latest",
					parameters: {
						temperature: 0.7,
						topP: 1,
						maxLength: 1024,
						responseFormat: "text" as const,
					},
				},
			};
			const messages = buildChatMessages(prompt);
			expect(messages).toEqual([{ role: "user", content: "Hi" }]);
		});

		it("drops empty user text", () => {
			const prompt = {
				text: "   ",
				systemText: "You are a bot",
				model: {
					provider: "open-ai" as const,
					model: "gpt-4o",
					version: "latest",
					parameters: {
						temperature: 0.7,
						topP: 1,
						maxLength: 1024,
						responseFormat: "text" as const,
					},
				},
			};
			const messages = buildChatMessages(prompt);
			expect(messages).toEqual([{ role: "system", content: "You are a bot" }]);
		});
	});
});
