describe("instrumentation registry diagnostics", () => {
	afterEach(() => {
		jest.resetModules();
		jest.restoreAllMocks();
	});

	it("warns when no provider is enabled", () => {
		const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

		const { instrument } = require("../lib/instrumentation/registry");
		instrument({});

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("No instrumentations were registered"),
		);
	});

	it("warns when OpenAI instrumentation cannot be initialized", () => {
		const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

		jest.doMock("@opentelemetry/instrumentation-openai", () => ({}));

		const { instrument } = require("../lib/instrumentation/registry");
		instrument({ openai: true });

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Cannot enable OpenAI instrumentation"),
		);
	});
});
