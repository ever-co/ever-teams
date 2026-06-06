// PostCSS config for @ever-teams/atoms package
// Tailwind CSS processing is disabled to preserve raw classes for consumer applications
// Consumer apps should process Tailwind classes through their own build pipeline

module.exports = {
	plugins: {
		// Tailwind processing
		'@tailwindcss/postcss': {}
	}
};
	