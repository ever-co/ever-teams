// Next.js 16: SVG type declarations for @svgr/webpack
// This allows SVG files to be imported as React components

declare module '*.svg' {
	import React = require('react');

	export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
	const content: React.FC<React.SVGProps<SVGSVGElement>>;
	export default content;
}

