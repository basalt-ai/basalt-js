import fixtures from '../__fixtures__/get-prompt.json'

import { GetPromptEndpoint } from '../lib/endpoints'
import PromptSDK from '../lib/sdk/prompt-sdk'

const mockedCache = {
	set: jest.fn(),
	get: jest.fn()
}
const fallbackCache = {
	set: jest.fn(),
	get: jest.fn()
}
const mockedApi = {
	invoke: jest.fn()
}

const prompt = new PromptSDK(
	mockedApi,
	mockedCache,
	fallbackCache,
	console
)

describe('PromptSDK', () => {
	beforeEach(() => {
		mockedApi.invoke.mockReset()

		mockedCache.set.mockReset()
		mockedCache.get.mockReset()

		fallbackCache.set.mockReset()
		fallbackCache.get.mockReset()
	})

	test('uses the get prompt endpoint', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: null,
			value: fixtures.validResponse.body
		}))

		await prompt.get({ slug: 'some-slug' })

		expect(mockedApi.invoke.mock.calls).toHaveLength(1)
		expect(mockedApi.invoke.mock.calls[0][0]).toBe(GetPromptEndpoint)
	})

	test('passes the full options to the endpoint (get/1)', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: null,
			value: fixtures.validResponse.body
		}))

		await prompt.get({ slug: 'some-slug', tag: 'custom-tag', version: '1.0.0' })

		expect(mockedApi.invoke.mock.calls).toHaveLength(1)
		expect(mockedApi.invoke.mock.calls[0][1]).toMatchObject({
			slug: 'some-slug',
			tag: 'custom-tag',
			version: '1.0.0'
		})
	})

	test('passes the full options to the endpoint (get/2)', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: null,
			value: fixtures.validResponse.body
		}))

		await prompt.get('some-slug', { tag: 'custom-tag', version: '1.0.0' })

		expect(mockedApi.invoke.mock.calls).toHaveLength(1)
		expect(mockedApi.invoke.mock.calls[0][1]).toMatchObject({
			slug: 'some-slug',
			tag: 'custom-tag',
			version: '1.0.0'
		})
	})

	test('forwards api failure', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: {
				message: 'An error occurred'
			},
			value: null
		}))

		const result = await prompt.get('some-slug')

		expect(result.value).toBe(null)
		expect(result.error).toMatchObject({
			message: 'An error occurred'
		})
	})

	test('tries to fetch from fallback cache on api failure', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: {
				message: 'An error occurred'
			},
			value: null
		}))

		const result = await prompt.get('some-slug')

		expect(result.value).toBe(null)
		expect(fallbackCache.get).toHaveBeenCalledTimes(1)
	})

	test('returns fallback cache on api failure', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: {
				message: 'An error occurred'
			},
			value: null
		}))

		fallbackCache.get.mockImplementationOnce((() => ({
			...fixtures.validResponse.body.prompt,
			text: 'my cached prompt'
		})))

		const result = await prompt.get('some-slug')

		expect(result.value).not.toBe({
			...fixtures.validResponse.body.prompt,
			text: 'my cached prompt'
		})
		expect(fallbackCache.get).toHaveBeenCalledTimes(1)
	})

	test('returns a prompt when all variables are filled', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: null,
			value: {
				...fixtures.validResponse.body,
				prompt: {
					...fixtures.validResponse.body.prompt,
					text: 'Hello {{name}}'
				}
			}
		}))

		const result = await prompt.get('some-slug', { version: '1.0.0', variables: { name: 'Pikachu' } })

		expect(result.error).toBe(null)
		expect(result.value?.text).toBe('Hello Pikachu')
	})

	test('saves raw result to cache', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: null,
			value: {
				...fixtures.validResponse.body,
				prompt: {
					...fixtures.validResponse.body.prompt,
					text: 'Some {{raw}} prompt'
				}
			}
		}))

		await prompt.get('some-slug')

		expect(mockedCache.set).toHaveBeenCalledTimes(1)
		expect(mockedCache.set.mock.calls[0][1]).toMatchObject({
			text: 'Some {{raw}} prompt',
			model: fixtures.validResponse.body.prompt.model
		})
	})

	test('caches for a finite amount of time', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: null,
			value: fixtures.validResponse.body
		}))

		await prompt.get('some-slug')

		expect(mockedCache.set).toHaveBeenCalledTimes(1)
		expect(mockedCache.set.mock.calls[0][2]).toBeDefined()
		expect(mockedCache.set.mock.calls[0][2]).toBeLessThan(Infinity)
	})

	test('caches in fallback forever', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: null,
			value: fixtures.validResponse.body
		}))

		await prompt.get('some-slug')

		expect(fallbackCache.set).toHaveBeenCalledTimes(1)
		expect(fallbackCache.set.mock.calls[0][2]).toBeDefined()
		expect(fallbackCache.set.mock.calls[0][2]).toBe(Infinity)
	})

	test('does not fetch prompt over network when cache is present', async () => {
		mockedApi.invoke.mockImplementationOnce(() => ({
			error: null,
			value: fixtures.validResponse.body
		}))

		mockedCache.get.mockImplementationOnce(() => ({
			...fixtures.validResponse.body.prompt,
			text: 'my cached prompt'
		}))

		const result = await prompt.get('some-slug')

		expect(mockedCache.get).toHaveBeenCalledTimes(1)
		expect(mockedApi.invoke).toHaveBeenCalledTimes(0)
		expect(result.value?.text).toBe('my cached prompt')
	})

	test('replaces variables in cached result', async () => {
		mockedCache.get.mockImplementationOnce(() => ({ text: 'Hello {{name}}' }))

		const result = await prompt.get(
			'some-slug',
			{ variables: { name: 'Test' } }
		)

		expect(mockedCache.get).toHaveBeenCalledTimes(1)
		expect(mockedApi.invoke).toHaveBeenCalledTimes(0)
		expect(result.value?.text).toBe('Hello Test')
	})
})
