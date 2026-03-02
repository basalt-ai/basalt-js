export interface SdkConstants {
	publicApiUrl: string;
	sdkVersion: string;
	sdkTarget: string;
	usedFallback: boolean;
	fallbackFields: string[];
}

function resolveSdkVersion(): string | undefined {
	return typeof __SDK_VERSION__ !== "undefined" ? __SDK_VERSION__ : undefined;
}

function resolveSdkTarget(): string | undefined {
	return typeof __SDK_TARGET__ !== "undefined" ? __SDK_TARGET__ : undefined;
}

function resolvePublicApiUrl(): string | undefined {
	return typeof __PUBLIC_API_URL__ !== "undefined"
		? __PUBLIC_API_URL__
		: undefined;
}

export function getSdkConstants(): SdkConstants {
	const fallbackFields: string[] = [];

	const sdkVersion = resolveSdkVersion();
	if (!sdkVersion) {
		fallbackFields.push("__SDK_VERSION__");
	}

	const sdkTarget = resolveSdkTarget();
	if (!sdkTarget) {
		fallbackFields.push("__SDK_TARGET__");
	}

	const publicApiUrl = resolvePublicApiUrl();
	if (!publicApiUrl) {
		fallbackFields.push("__PUBLIC_API_URL__");
	}

	return {
		sdkVersion: sdkVersion ?? "dev",
		sdkTarget: sdkTarget ?? "nodejs",
		publicApiUrl:
			publicApiUrl ??
			process.env["BASALT_PUBLIC_API_URL"] ??
			"https://api.getbasalt.ai",
		usedFallback: fallbackFields.length > 0,
		fallbackFields,
	};
}
