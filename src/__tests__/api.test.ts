import Api from '../lib/utils/api'
import type { FetchMethod, Result } from '../lib/resources/contract'
import { err, ok } from '../lib/utils/utils'

const mockedNetwork = {
	fetch: jest.fn(),
}

const fakeEndpoint = {
	prepareRequest: jest.fn(() => ({
		method: 'get' as FetchMethod,
		path: 'test-path',
	})),
	decodeResponse: jest.fn(() => {
		const response = ok({})

		return response as Result<unknown>
	}),
}

describe('API', () => {
	beforeEach(() => {
		mockedNetwork.fetch.mockReset()
		fakeEndpoint.prepareRequest.mockReset()
		fakeEndpoint.decodeResponse.mockReset()
	})

	test('does network request with endpoint-defined path', async () => {
		fakeEndpoint.prepareRequest.mockImplementationOnce(() => ({	path: 'my-test-path', method: 'get' }))
		fakeEndpoint.decodeResponse.mockImplementationOnce(() => ok({}))
		mockedNetwork.fetch.mockImplementationOnce(() => ok({}))

		const api = new Api(
			new URL('http://test/'),
			mockedNetwork,
			'some-api-key',
		)

		await api.invoke(fakeEndpoint, {})

		expect(fakeEndpoint.prepareRequest.mock.calls).toHaveLength(1)
		expect(mockedNetwork.fetch.mock.calls[0][0]).toBeInstanceOf(URL)

		const url = mockedNetwork.fetch.mock.calls[0][0] as URL

		expect(url.pathname).toBe('/my-test-path')
	})

	test.each(
		['get', 'post', 'put', 'delete'] as FetchMethod[],
	)('does network request with endpoint-defined http method (%s)', async (method) => {
		mockedNetwork.fetch.mockImplementationOnce(() => ok({}))
		fakeEndpoint.decodeResponse.mockImplementationOnce(() => ok({}))
		fakeEndpoint.prepareRequest.mockImplementationOnce(() => ({	path: '', method }))

		const api = new Api(
			new URL('http://test/'),
			mockedNetwork,
			'some-api-key',
		)

		await api.invoke(fakeEndpoint, {})

		expect(fakeEndpoint.prepareRequest.mock.calls).toHaveLength(1)
		expect(mockedNetwork.fetch.mock.calls).toHaveLength(1)
		expect(mockedNetwork.fetch.mock.calls[0][1]).toBe(method)
	})

	test.each([
		{ query: { tag: 'abc', version: '1' }, expected: 'tag=abc&version=1' },
		{ query: { tag: '', version: '1' }, expected: 'tag=&version=1' },
		{ query: { version: '1' }, expected: 'version=1' },
		{ query: { tag: undefined, version: '1' }, expected: 'version=1' },
	])('includes query parameters in final url', async ({ query, expected }) => {
		mockedNetwork.fetch.mockImplementationOnce(() => ok({}))
		fakeEndpoint.decodeResponse.mockImplementationOnce(() => ok({}))
		fakeEndpoint.prepareRequest.mockImplementationOnce(() => ({	path: '', method: 'get', query }))

		const api = new Api(
			new URL('http://test/'),
			mockedNetwork,
			'some-api-key',
		)

		await api.invoke(fakeEndpoint, {})

		expect(mockedNetwork.fetch.mock.calls[0][0]).toBeInstanceOf(URL)

		const url = mockedNetwork.fetch.mock.calls[0][0] as URL

		expect(url.search).toBe(`?${expected}`)
	})

	test('decodes fetch result using endpoint', async () => {
		fakeEndpoint.prepareRequest.mockImplementationOnce(() => ({	path: '', method: 'get' }))
		fakeEndpoint.decodeResponse.mockImplementationOnce(() => ok({ some: 'decoded-response' }))
		mockedNetwork.fetch.mockImplementationOnce(() => ok({}))

		const api = new Api(
			new URL('http://test/'),
			mockedNetwork,
			'some-api-key',
		)

		const result = await api.invoke(fakeEndpoint, {})

		expect(fakeEndpoint.decodeResponse.mock.calls).toHaveLength(1)

		expect(result.error).toBeNull()
		expect(result.value).toMatchObject({ some: 'decoded-response' })
	})

	test('forwards decoding error', async () => {
		fakeEndpoint.prepareRequest.mockImplementationOnce(() => ({	path: '', method: 'get' }))
		fakeEndpoint.decodeResponse.mockImplementationOnce(() => err({ message: 'Some decoding problem' }))
		mockedNetwork.fetch.mockImplementationOnce(() => ok({}))

		const api = new Api(
			new URL('http://test/'),
			mockedNetwork,
			'some-api-key',
		)

		const result = await api.invoke(fakeEndpoint, {})

		expect(fakeEndpoint.decodeResponse.mock.calls).toHaveLength(1)

		expect(result.value).toBeNull()
		expect(result.error).toMatchObject({ message: 'Some decoding problem' })
	})

	test('makes request with the given APIKey as auth header', async () => {
		fakeEndpoint.prepareRequest.mockImplementationOnce(() => ({	path: '', method: 'get' }))
		fakeEndpoint.decodeResponse.mockImplementationOnce(() => err({ message: 'Some decoding problem' }))
		mockedNetwork.fetch.mockImplementationOnce(() => ok({}))

		const api = new Api(
			new URL('http://test/'),
			mockedNetwork,
			'some-api-key',
		)

		await api.invoke(fakeEndpoint, {})

		expect(mockedNetwork.fetch.mock.calls[0][3]).toMatchObject({
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Authorization: 'Bearer some-api-key',
		})
	})

	test('passes SDK vesion as header on requests', async () => {
		fakeEndpoint.prepareRequest.mockImplementationOnce(() => ({	path: '', method: 'get' }))
		fakeEndpoint.decodeResponse.mockImplementationOnce(() => err({ message: 'Some decoding problem' }))
		mockedNetwork.fetch.mockImplementationOnce(() => ok({}))

		const api = new Api(
			new URL('http://test/'),
			mockedNetwork,
			'some-api-key',
			'1.0.0',
		)

		await api.invoke(fakeEndpoint, {})

		expect(mockedNetwork.fetch.mock.calls[0][3]).toMatchObject({
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'X-BASALT-SDK-VERSION': '1.0.0',
		})
	})

	test('passes SDK vesion as header on requests', async () => {
		fakeEndpoint.prepareRequest.mockImplementationOnce(() => ({	path: '', method: 'get' }))
		fakeEndpoint.decodeResponse.mockImplementationOnce(() => err({ message: 'Some decoding problem' }))
		mockedNetwork.fetch.mockImplementationOnce(() => ok({}))

		const api = new Api(
			new URL('http://test/'),
			mockedNetwork,
			'some-api-key',
			'1.0.0',
			'test-runner',
		)

		await api.invoke(fakeEndpoint, {})

		expect(mockedNetwork.fetch.mock.calls[0][3]).toMatchObject({
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'X-BASALT-SDK-TYPE': 'test-runner',
		})
	})
})
