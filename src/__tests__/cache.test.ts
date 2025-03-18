import MemoryCache from '../lib/utils/memorycache'

const nowMock = jest.fn(() => 1000)

Date.now = nowMock

describe('MemoryCache', () => {
	test('can save a key-value pair', () => {
		const cache = new MemoryCache()

		cache.set('abc', 123)
		const number = cache.get('abc')

		expect(number).toBe(123)

		cache.set('xyz', 'Hello World')
		const string = cache.get('xyz')

		expect(string).toBe('Hello World')

		cache.set('foo', { bar: 1 })
		const obj = cache.get('foo')

		expect(obj).toMatchObject({ bar: 1 })

		cache.set('fruits', ['apple', 'banana', 'tomato'])
		const fruits = cache.get<string[]>('fruits')

		expect(fruits).toBeInstanceOf(Array)
		expect(fruits).toHaveLength(3)
		expect(fruits?.[0]).toBe('apple')
		expect(fruits?.[1]).toBe('banana')
		expect(fruits?.[2]).toBe('tomato')
	})

	test('cache times out after specified delay', () => {
		const cache = new MemoryCache()

		cache.set('abc', 123, 500)
		expect(cache.get('abc')).toBe(123)

		nowMock.mockImplementationOnce(() => 1499)
		expect(cache.get('abc')).toBe(123)

		nowMock.mockImplementationOnce(() => 1501)
		expect(cache.get('abc')).toBe(undefined)
	})
})
