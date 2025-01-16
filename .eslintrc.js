module.exports = {
	extends: ['../../.eslintrc.js'],
	ignorePatterns: ['!**/*'],
	overrides: [
		{
			files: ['./**/*.ts', './**/*.tsx'],
			parserOptions: {
				project: ['packages/js-sdk/tsconfig.*?.json'],
			},
			rules: {
				// Insert project specific rules here
			},
		},
	],
};
