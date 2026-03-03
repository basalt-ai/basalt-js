import { getSdkConstants } from "../lib/runtime/sdk-constants";

describe("getSdkConstants", () => {
	const originalPublicApiUrl = (global as any).__PUBLIC_API_URL__;
	const originalSdkVersion = (global as any).__SDK_VERSION__;
	const originalSdkTarget = (global as any).__SDK_TARGET__;
	const originalBasaltPublicApiUrl = process.env["BASALT_PUBLIC_API_URL"];

	afterEach(() => {
		(global as any).__PUBLIC_API_URL__ = originalPublicApiUrl;
		(global as any).__SDK_VERSION__ = originalSdkVersion;
		(global as any).__SDK_TARGET__ = originalSdkTarget;
		if (originalBasaltPublicApiUrl === undefined) {
			delete process.env["BASALT_PUBLIC_API_URL"];
		} else {
			process.env["BASALT_PUBLIC_API_URL"] = originalBasaltPublicApiUrl;
		}
	});

	it("uses compile-time constants when available", () => {
		(global as any).__PUBLIC_API_URL__ = "https://compile.example";
		(global as any).__SDK_VERSION__ = "1.2.3";
		(global as any).__SDK_TARGET__ = "nodejs";

		const constants = getSdkConstants();

		expect(constants.publicApiUrl).toBe("https://compile.example");
		expect(constants.sdkVersion).toBe("1.2.3");
		expect(constants.sdkTarget).toBe("nodejs");
		expect(constants.usedFallback).toBe(false);
		expect(constants.fallbackFields).toEqual([]);
	});

	it("falls back safely when compile-time constants are missing", () => {
		(global as any).__PUBLIC_API_URL__ = undefined;
		(global as any).__SDK_VERSION__ = undefined;
		(global as any).__SDK_TARGET__ = undefined;
		process.env["BASALT_PUBLIC_API_URL"] = "https://env.example";

		const constants = getSdkConstants();

		expect(constants.publicApiUrl).toBe("https://env.example");
		expect(constants.sdkVersion).toBe("dev");
		expect(constants.sdkTarget).toBe("nodejs");
		expect(constants.usedFallback).toBe(true);
		expect(constants.fallbackFields).toContain("PUBLIC_API_URL");
		expect(constants.fallbackFields).toContain("SDK_VERSION");
		expect(constants.fallbackFields).toContain("SDK_TARGET");
	});
});
