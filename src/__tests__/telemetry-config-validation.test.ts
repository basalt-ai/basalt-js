import { validateTelemetryConfig } from "../lib/telemetry/config-validation";

describe("validateTelemetryConfig", () => {
	it("falls back when endpoint is invalid", () => {
		const result = validateTelemetryConfig(
			{ enabled: true, endpoint: "not-a-url" },
			"not-a-url",
			"api-key",
		);

		expect(result.endpoint).toBe("https://grpc.otel.getbasalt.ai");
		expect(result.warnings.join(" ")).toContain("Invalid telemetry endpoint");
	});

	it("warns when insecure=true with https endpoint", () => {
		const result = validateTelemetryConfig(
			{ enabled: true, insecure: true },
			"https://grpc.otel.getbasalt.ai",
			"api-key",
		);

		expect(result.warnings.join(" ")).toContain("insecure=true");
	});

	it("warns when insecure=false with http endpoint", () => {
		const result = validateTelemetryConfig(
			{ enabled: true, insecure: false },
			"http://localhost:4317",
			"api-key",
		);

		expect(result.warnings.join(" ")).toContain("insecure HTTP");
	});

	it("warns when API key is empty", () => {
		const result = validateTelemetryConfig(
			{ enabled: true },
			"https://grpc.otel.getbasalt.ai",
			"",
		);

		expect(result.warnings.join(" ")).toContain("API key is empty");
	});
});
