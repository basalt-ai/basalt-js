import type { TelemetryConfig } from "../resources/contract";

export interface TelemetryValidationResult {
	endpoint: string;
	insecure: boolean;
	warnings: string[];
}

const DEFAULT_OTLP_ENDPOINT = "https://grpc.otel.getbasalt.ai";

function isLikelyAbsoluteUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export function validateTelemetryConfig(
	telemetry: TelemetryConfig | undefined,
	resolvedEndpoint: string,
	apiKey: string,
): TelemetryValidationResult {
	const warnings: string[] = [];
	let endpoint = resolvedEndpoint;
	const insecure = telemetry?.insecure ?? false;

	if (!isLikelyAbsoluteUrl(endpoint)) {
		warnings.push(
			`Invalid telemetry endpoint "${endpoint}". Falling back to ${DEFAULT_OTLP_ENDPOINT}.`,
		);
		endpoint = DEFAULT_OTLP_ENDPOINT;
	}

	if (endpoint.startsWith("https://") && insecure) {
		warnings.push(
			`Telemetry config mismatch: endpoint ${endpoint} uses TLS but insecure=true.`,
		);
	}

	if (endpoint.startsWith("http://") && !insecure) {
		warnings.push(
			`Telemetry config mismatch: endpoint ${endpoint} is insecure HTTP but insecure=false.`,
		);
	}

	if (!apiKey.trim()) {
		warnings.push(
			"Telemetry API key is empty. Spans will fail export authentication.",
		);
	}

	return {
		endpoint,
		insecure,
		warnings,
	};
}
