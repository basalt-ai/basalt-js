/**
 * OpenTelemetry attribute keys for Basalt SDK instrumentation
 * Following Python SDK conventions
 */
export const BASALT_ATTRIBUTES = {
	// Epic parity attributes
	SDK: "basalt.sdk",
	VERSION: "basalt.version",
	SPAN_TYPE: "basalt.span_type",
	TRACE: "basalt.trace",
	IN_TRACE: "basalt.in_trace",

	// Root span markers
	ROOT: "basalt.root",

	// Span classification
	SPAN_KIND: "basalt.span.kind",

	// Root span markers
	ROOT: 'basalt.root',

	// SDK identification
	SDK_NAME: "basalt.sdk.name",
	SDK_VERSION: "basalt.sdk.version",
	SDK_TARGET: "basalt.sdk.target",
	SDK_TYPE: "basalt.sdk.type",
	OPERATION: "basalt.operation",

	// Metadata and variables
	METADATA: "basalt.metadata",
	SPAN_VARIABLES: "basalt.span.variables",
	SPAN_INPUT: "basalt.span.input",
	SPAN_OUTPUT: "basalt.span.output",

	// API layer attributes
	API_CLIENT: "basalt.api.client",
	API_OPERATION: "basalt.api.operation",
	INTERNAL_API: "basalt.internal.api",

	// Request tracking
	REQUEST_DURATION_MS: "basalt.request.duration_ms",
	REQUEST_SUCCESS: "basalt.request.success",

	// Prompt attributes
	PROMPT_SLUG: "basalt.prompt.slug",
	PROMPT_VERSION: "basalt.prompt.version",
	PROMPT_TAG: "basalt.prompt.tag",
	PROMPT_VARIABLES_COUNT: "basalt.prompt.variables_count",
	PROMPT_FEATURE_SLUG: "basalt.prompt.feature_slug",

	// Dataset attributes
	DATASET_SLUG: "basalt.dataset.slug",
	DATASET_ROW_COUNT: "basalt.dataset.row_count",

	// Experiment attributes
	EXPERIMENT_ID: "basalt.experiment.id",
	EXPERIMENT_NAME: "basalt.experiment.name",
	EXPERIMENT_FEATURE_SLUG: "basalt.experiment.feature_slug",

	// Identity tracking
	TRACE_IDENTITY: 'basalt.trace_identity',
	IDENTITY_USER_ID: 'basalt.identity.user_id',
	IDENTITY_ORGANIZATION_ID: 'basalt.identity.organization_id',
	IDENTITY_PREFIX: 'basalt.identity.',

	// Evaluation configuration
	EVALUATION_CONFIG: 'basalt.evaluation.config',

	// Evaluation configuration
	EVALUATION_CONFIG: "basalt.evaluation.config",

	// Cache attributes
	CACHE_HIT: "basalt.cache.hit",
	CACHE_TYPE: "basalt.cache.type",

	// HTTP semantic conventions
	HTTP_METHOD: "http.method",
	HTTP_URL: "http.url",
	HTTP_STATUS_CODE: "http.status_code",
	HTTP_RESPONSE_TIME_MS: "http.response_time_ms",

	// Context propagation attributes - identity
	USER_ID: "basalt.user.id",
	USER_NAME: "basalt.user.name",
	ORG_ID: "basalt.organization.id",
	ORG_NAME: "basalt.organization.name",
	FEATURE_SLUG: "basalt.span.feature_slug",

	// Error attributes
	ERROR_TYPE: "error.type",
	ERROR_MESSAGE: "error.message",
	ERROR_CODE: "basalt.error.code",
} as const;

/**
 * Metadata attribute prefix for custom metadata
 */
export const METADATA_PREFIX = "basalt.meta.";

/**
 * Cache type values
 */
export const CACHE_TYPES = {
	QUERY: "query",
	FALLBACK: "fallback",
	NONE: "none",
} as const;

/**
 * API client names
 */
export const API_CLIENTS = {
	PROMPTS: "prompts",
	DATASETS: "datasets",
	EXPERIMENTS: "experiments",
	MONITOR: "monitor",
} as const;
