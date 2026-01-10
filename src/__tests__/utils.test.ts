import { getVariableNames, replaceVariables } from "../lib/utils/utils";

describe("getVariableNames", () => {
	it.each([
		{
			input: "Hello",
			expected: [],
		},
		{
			input: "Hello {{name}}",
			expected: ["name"],
		},
		{
			input: "{{a}} + {{b}} = {{x}}",
			expected: ["a", "b", "x"],
		},
		{
			input: "{{a} } {{b}}",
			expected: ["a} } {{b"],
		},
		{
			input: "{{SomeCamelCase}}",
			expected: ["SomeCamelCase"],
		},
		{
			input: "{{1756822}}",
			expected: ["1756822"],
		},
		{
			input: "{{abc:def:àà}}",
			expected: ["abc:def:àà"],
		},
	])("getVariableNames case", (testCase) => {
		const r = getVariableNames(testCase.input);

		expect(r).toEqual(testCase.expected);
	});
});

describe("replaceVariables", () => {
	it.each([
		[
			["Hello {{name}}", { name: "Basalt" }, "Hello Basalt"],
			["{{a}} + {{b}} = {{c}}", { a: 1, b: 2, c: 3 }, "1 + 2 = 3"],
			["Hello {{missing}}", {}, "Hello {{missing}}"],
		] as const,
	])("replaces variables correctly", ([raw, vars, result]) => {
		const f = replaceVariables(raw, vars);

		expect(f).toBe(result);
	});
});
