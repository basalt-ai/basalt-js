import { initOpenTelemetry, shutdown, OpenTelemetryConfig } from '../lib/otel';

// Mock the OpenTelemetry modules
jest.mock('@opentelemetry/sdk-node');
jest.mock('@opentelemetry/exporter-trace-otlp-http');
jest.mock('@opentelemetry/exporter-trace-otlp-grpc');
jest.mock('@opentelemetry/auto-instrumentations-node');
jest.mock('@opentelemetry/instrumentation-http');
jest.mock('@opentelemetry/instrumentation-undici');

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const MockedNodeSDK = NodeSDK as jest.MockedClass<typeof NodeSDK>;
const MockedOTLPTraceExporter = OTLPTraceExporter as jest.MockedClass<typeof OTLPTraceExporter>;
const MockedOTLPGrpcTraceExporter = OTLPGrpcTraceExporter as jest.MockedClass<typeof OTLPGrpcTraceExporter>;

describe('OpenTelemetry Integration', () => {
	let mockSDKInstance: jest.Mocked<NodeSDK>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockSDKInstance = {
			start: jest.fn().mockResolvedValue(undefined),
			shutdown: jest.fn().mockResolvedValue(undefined),
		} as any;
		MockedNodeSDK.mockImplementation(() => mockSDKInstance);
	});

	afterEach(async () => {
		await shutdown();
	});

	describe('initOpenTelemetry', () => {
		it('should initialize with default configuration', async () => {
			await initOpenTelemetry();

			expect(MockedNodeSDK).toHaveBeenCalledTimes(1);
			expect(mockSDKInstance.start).toHaveBeenCalledTimes(1);
		});

		it('should use HTTP exporter by default', async () => {
			await initOpenTelemetry();

			expect(MockedOTLPTraceExporter).toHaveBeenCalledWith({
				url: 'http://localhost:4318/v1/traces',
				headers: {},
			});
		});

		it('should use gRPC exporter when specified', async () => {
			await initOpenTelemetry({
				exporterType: 'grpc',
			});

			expect(MockedOTLPGrpcTraceExporter).toHaveBeenCalledWith({
				url: 'http://localhost:4317',
				headers: {},
			});
		});

		it('should use custom endpoint when provided', async () => {
			const customEndpoint = 'https://api.honeycomb.io/v1/traces/my-dataset';
			await initOpenTelemetry({
				endpoint: customEndpoint,
			});

			expect(MockedOTLPTraceExporter).toHaveBeenCalledWith({
				url: customEndpoint,
				headers: {},
			});
		});

		it('should use custom headers', async () => {
			const headers = {
				'x-honeycomb-team': 'test-key',
				'authorization': 'Bearer token',
			};
			await initOpenTelemetry({
				headers,
			});

			expect(MockedOTLPTraceExporter).toHaveBeenCalledWith({
				url: 'http://localhost:4318/v1/traces',
				headers,
			});
		});

		it('should use environment variables when available', async () => {
			const originalEnv = process.env;
			process.env = {
				...originalEnv,
				OTEL_EXPORTER_OTLP_ENDPOINT: 'https://env-endpoint.com/v1/traces',
				OTEL_SERVICE_NAME: 'env-service-name',
				OTEL_SERVICE_VERSION: '2.0.0',
				OTEL_EXPORTER_OTLP_HEADERS: 'x-api-key=env-key,x-custom=env-value',
			};

			await initOpenTelemetry();

			expect(MockedOTLPTraceExporter).toHaveBeenCalledWith({
				url: 'https://env-endpoint.com/v1/traces',
				headers: {
					'x-api-key': 'env-key',
					'x-custom': 'env-value',
				},
			});

			// Check that resource was created with correct service name and version
			const sdkCall = MockedNodeSDK.mock.calls[0][0];
			expect(sdkCall.resource.attributes).toMatchObject({
				'service.name': 'env-service-name',
				'service.version': '2.0.0',
			});

			process.env = originalEnv;
		});

		it('should prioritize config over environment variables', async () => {
			const originalEnv = process.env;
			process.env = {
				...originalEnv,
				OTEL_EXPORTER_OTLP_ENDPOINT: 'https://env-endpoint.com/v1/traces',
				OTEL_SERVICE_NAME: 'env-service',
			};

			await initOpenTelemetry({
				endpoint: 'https://config-endpoint.com/v1/traces',
				serviceName: 'config-service',
			});

			expect(MockedOTLPTraceExporter).toHaveBeenCalledWith({
				url: 'https://config-endpoint.com/v1/traces',
				headers: {},
			});

			const sdkCall = MockedNodeSDK.mock.calls[0][0];
			expect(sdkCall.resource.attributes).toMatchObject({
				'service.name': 'config-service',
			});

			process.env = originalEnv;
		});

		it('should include resource attributes', async () => {
			const resourceAttributes = {
				'deployment.environment': 'test',
				'service.namespace': 'ai-services',
			};

			await initOpenTelemetry({
				serviceName: 'test-service',
				serviceVersion: '1.0.0',
				resourceAttributes,
			});

			const sdkCall = MockedNodeSDK.mock.calls[0][0];
			expect(sdkCall.resource.attributes).toMatchObject({
				'service.name': 'test-service',
				'service.version': '1.0.0',
				...resourceAttributes,
			});
		});

		it('should handle instrumentations configuration', async () => {
			await initOpenTelemetry({
				enableAutoInstrumentations: true,
				enableHttpInstrumentation: true,
				enableUndiciInstrumentation: true,
			});

			const sdkCall = MockedNodeSDK.mock.calls[0][0];
			expect(sdkCall.instrumentations).toBeDefined();
			expect(Array.isArray(sdkCall.instrumentations)).toBe(true);
		});

		it('should disable instrumentations when configured', async () => {
			await initOpenTelemetry({
				enableAutoInstrumentations: false,
				enableHttpInstrumentation: false,
				enableUndiciInstrumentation: false,
			});

			const sdkCall = MockedNodeSDK.mock.calls[0][0];
			expect(sdkCall.instrumentations).toEqual([]);
		});
	});

	describe('shutdown', () => {
		it('should shutdown SDK when initialized', async () => {
			await initOpenTelemetry();
			await shutdown();

			expect(mockSDKInstance.shutdown).toHaveBeenCalledTimes(1);
		});

		it('should handle shutdown when not initialized', async () => {
			// Should not throw
			await shutdown();
			expect(mockSDKInstance.shutdown).not.toHaveBeenCalled();
		});

		it('should allow multiple shutdown calls', async () => {
			await initOpenTelemetry();
			await shutdown();
			await shutdown(); // Should not throw

			expect(mockSDKInstance.shutdown).toHaveBeenCalledTimes(1);
		});
	});
});