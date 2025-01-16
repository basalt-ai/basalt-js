import { getVariableNames, pickVariables, replaceVariables } from '../lib/utils'

describe('getVariableNames', () => {
	it.each([
		{
			input: 'Hello',
			expected: []
		},
		{
			input: 'Hello {{name}}',
			expected: ['name']
		},
		{
			input: '{{a}} + {{b}} = {{x}}',
			expected: ['a', 'b', 'x']
		},
		{
			input: '{{a} } {{b}}',
			expected: ['a} } {{b']
		},
		{
			input: '{{SomeCamelCase}}',
			expected: ['SomeCamelCase']
		},
		{
			input: '{{1756822}}',
			expected: ['1756822']
		},
		{
			input: '{{abc:def:àà}}',
			expected: ['abc:def:àà']
		}
	])('getVariableNames case', testCase => {
		const r = getVariableNames(testCase.input)

		expect(r).toEqual(testCase.expected)
	})
})

describe('pickVariables', () => {
	it('fails when a variable is missing', () => {
		const r = pickVariables(['a'], { b: '2' })

		expect(r.error).not.toBeNull()
		expect(r.value).toBeNull()
	})

	it('fails when a variable is explicitly undefined', () => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const r = pickVariables(['a'], { b: '2', a: undefined } as unknown as any)

		expect(r.error).not.toBeNull()
		expect(r.value).toBeNull()
	})

	it('succeeds when all variables are defined', () => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const r = pickVariables(['a', 'b'], { a: '2', b: '112' } as unknown as any)

		expect(r.error).toBeNull()
		expect(r.value).toMatchObject({ a: '2', b: '112' })
	})

	it('omits other keys', () => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const r = pickVariables(['a', 'b'], { a: '2', b: '112', c: 'unnecessary variable' } as unknown as any)

		expect(r.error).toBeNull()
		expect(r.value).toEqual({ a: '2', b: '112' })
	})
})

describe('replaceVariables', () => {
	it.each([
		[
			['Hello {{name}}', { name: 'Basalt' }, 'Hello Basalt'],
			['{{a}} + {{b}} = {{c}}', { a: 1, b: 2, c: 3 }, '1 + 2 = 3'],
			['Hello {{missing}}', {}, 'Hello {{missing}}']
		] as const
	])('replaces variables correctly', ([raw, vars, result]) => {
		const f = replaceVariables(raw, vars)

		expect(f).toBe(result)
	})
})
