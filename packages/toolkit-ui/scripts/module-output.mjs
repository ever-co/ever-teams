// Output names for builds with preserveModules, shared by toolkit-ui and atoms.

// The kit's own packages: never bundled, so a host that installs two of them gets one copy of each.
export const isKitPackage = (id) => id.startsWith('@ever-teams/');

// A bundled third-party module goes under vendor/, named by its path inside node_modules: npm leaves every
// node_modules folder out of a published package, and the path above it differs from one checkout to another.
export function outputFileName(chunk, extension) {
	// Module ids may start with \0 (a module a plugin made) and end with a query (?commonjs-es-import).
	const [modulePath, query] = (chunk.facadeModuleId ?? '').replace(/^\0/, '').replaceAll('\\', '/').split('?');
	const insideNodeModules = modulePath.lastIndexOf('/node_modules/');
	if (insideNodeModules < 0) {
		return `${chunk.name}${extension}`;
	}
	const packagePath = modulePath.slice(insideNodeModules + '/node_modules/'.length).replace(/\.[cm]?[jt]sx?$/, '');
	let variant = '';
	if (query) {
		variant = `.${query.replace(/[^\w-]/g, '_')}`;
	}
	return `vendor/${packagePath}${variant}${extension}`;
}
