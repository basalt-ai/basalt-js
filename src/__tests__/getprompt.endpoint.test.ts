import fixtures from "../__fixtures__/get-prompt.json";
import { GetPromptEndpoint } from "../lib/endpoints";

describe("GetPromptEndpoint", () => {
	test("slug is included in pathname", async () => {
		const result = GetPromptEndpoint.prepareRequest({
			slug: "my-complex-slug-that-should-be-unique",
		});

		expect(result.path).toContain("my-complex-slug-that-should-be-unique");
	});

	test("includes version in query when present", async () => {
		const result = GetPromptEndpoint.prepareRequest({
			slug: "slug",
			version: "version",
		});

		expect(result.query).toMatchObject({ version: "version" });
	});

	test("includes tag in query when present", async () => {
		const result = GetPromptEndpoint.prepareRequest({
			slug: "slug",
			tag: "tag",
		});

		expect(result.query).toMatchObject({ tag: "tag" });
	});

	test("positively decodes valid responses", async () => {
		const result = GetPromptEndpoint.decodeResponse(
			fixtures.validResponse.body,
		);

		expect(result.error).toBeNull();
		expect(result.value?.prompt).toMatchObject(
			fixtures.validResponse.body.prompt,
		);
	});

	test.each([
		"some text - while the content should be json",
		null,
		undefined,
		[],
		100,
		true,
		fixtures.falsePositive.body,
	])("rejects invalid responses", async (body) => {
		const result = GetPromptEndpoint.decodeResponse(body);

		expect(result.error).not.toBeNull();
	});
});
