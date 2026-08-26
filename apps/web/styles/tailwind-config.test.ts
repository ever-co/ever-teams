const tailwindConfig = require('../tailwind.config.js');

describe('web Tailwind theme', () => {
	it('registers the input border color used by shared form controls', () => {
		expect(tailwindConfig.theme.extend.colors.input).toBe('hsl(var(--input))');
	});
});
