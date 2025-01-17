const fs = require('fs');
const path = require('path');

const {withNx} = require('@nx/rollup/with-nx');
const replace = require('@rollup/plugin-replace');
const minify = require('@rollup/plugin-terser');

module.exports = withNx(
	{
		main: './src/index.ts',
		outputPath: '../../dist/packages/js-sdk',
		tsConfig: './tsconfig.lib.json',
		compiler: 'swc',
		format: ['cjs', 'esm'],
		assets: [{input: '.', output: '.', glob: './packages/js-sdk/*.md'}],
	},
	{
		// Provide additional rollup configuration here. See: https://rollupjs.org/configuration-options
		plugins: [
			replace({
				values: {
					__SDK_VERSION__: process.env.BUILD === 'production' ? getPackageVersion() : '"dev"',
					__SDK_TARGET__: '"nodejs"',
					__PUBLIC_API_URL__: process.env.BUILD === 'production' ? '"https://api.getbasalt.ai"' : '"http://localhost:3001"',
				},
				preventAssignment: true,
			}),
			minify(),
		],
	},
);

function getPackageVersion() {
	const packageJson = fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8');
	const {version} = JSON.parse(packageJson);

	return `"${version}"`;
}
