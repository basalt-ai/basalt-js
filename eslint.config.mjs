import baseConfig from '../../eslint.config.mjs'

export default [
	...baseConfig,
	{
		overrides: [
			{
				files: ['tests/**/*'],
				env: {
					jest: true,
				},
			},
		],
	},
]
