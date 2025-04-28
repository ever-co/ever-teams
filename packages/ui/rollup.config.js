import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve as resolve } from "@rollup/plugin-node-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import terser from "@rollup/plugin-terser";

export default {
	input: "src/index.ts",
	output: [
		{
			file: "dist/index.es.js",
			format: "es",
			sourcemap: false,
		},
	],
	plugins: [
		peerDepsExternal(),
		resolve({
			extensions: [".js", ".ts", ".jsx", ".tsx"],
			preferBuiltins: true,
		}),
		commonjs(),
		typescript(),
		postcss({ minimize: true, extract: true }),
		terser({
			compress: {
				drop_console: true, // Remove console.log statements
				drop_debugger: true, // Remove debugger statements
			},
			mangle: true, // Shorten variable names
		}),
	],
	external: (id) => /^react/.test(id),
	onwarn(warning, warn) {
		if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
		warn(warning);
	},
	watch: {
		include: "src/**",
		exclude: "node_modules/**",
	},
};
