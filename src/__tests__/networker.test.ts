import fixtures from '../__fixtures__/networker.json'
import { NetworkBaseError } from '../lib/errors'

import Networker from '../lib/networker'

const mockedFetch = jest.fn()
const n = new Networker()
const url = new URL('http://localhost:3000')

global.fetch = mockedFetch

describe('Networker', () => {
	beforeEach(() => {
		mockedFetch.mockReset()
	})

	test('uses fetch to make http calls', async () => {
		await n.fetch(url, 'get')

		expect(mockedFetch.mock.calls).toHaveLength(1)
		expect(mockedFetch.mock.calls[0][0]).toBe(url)
		expect(mockedFetch.mock.calls[0][1].method).toBe('get')
	})

	test('captures unexpected fetch errors', async () => {
		mockedFetch.mockImplementationOnce(() => {
			throw new Error()
		})

		const result = await n.fetch(url, 'get')

		expect(mockedFetch.mock.calls).toHaveLength(1)
		expect(result.value).toBe(null)
		expect(result.error).not.toBe(null)
		expect(result.error?.message).toBe('Unexpected error')
	})

	test('rejects non-json response with failure object', async () => {
		mockedFetch.mockImplementationOnce(
			() => makeMockedResponse(
				200,
				() => Promise.reject(new Error('Failed to parse JSON')),
			),
		)

		const result = await n.fetch(url, 'get')

		expect(mockedFetch.mock.calls).toHaveLength(1)
		expect(result.value).toBe(null)
		expect(result.error).not.toBe(null)
	})

	test.each(fixtures.badHttpStatuses)(
		'rejects %i http status with failure object',
		async (fixture) => {
			mockedFetch.mockImplementationOnce(() => makeMockedResponse(fixture, {}))

			const result = await n.fetch(url, 'get')

			expect(mockedFetch.mock.calls).toHaveLength(1)
			expect(result.value).toBe(null)
			expect(result.error).toBeInstanceOf(NetworkBaseError)
		},
	)

	test('returns response body in result object', async () => {
		mockedFetch.mockImplementationOnce(() => makeMockedResponse(
			fixtures.jsonResponse.status,
			fixtures.jsonResponse.body,
		))

		const result = await n.fetch(url, 'get')

		expect(mockedFetch.mock.calls).toHaveLength(1)
		expect(result.value).toMatchObject(fixtures.jsonResponse.body)
		expect(result.error).toBe(null)
	})
})

const makeMockedResponse = <T>(status: number, json: (() => Promise<T>) | T) => ({
	status,
	json: typeof json === 'function' ? json : async () => json,
	headers: {} as unknown as Headers,
	ok: false,
	redirected: false,
	statusText: '',
	type: 'error',
	url: '',
	clone(): Response {
		throw new Error('Function not implemented.')
	},
	body: null,
	bodyUsed: false,
	arrayBuffer(): Promise<ArrayBuffer> {
		throw new Error('Function not implemented.')
	},
	blob(): Promise<Blob> {
		throw new Error('Function not implemented.')
	},
	formData(): Promise<FormData> {
		throw new Error('Function not implemented.')
	},
	text(): Promise<string> {
		throw new Error('Function not implemented.')
	},
	bytes(): Promise<Uint8Array> {
		throw new Error('Function not implemented.')
	},
})
