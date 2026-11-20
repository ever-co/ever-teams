import { dataColorChipOf, dataColorHueOf } from './data-color';

function channelsOf(color: string) {
	const match = /rgba?\((\d+), (\d+), (\d+)/.exec(color);
	if (!match) {
		throw new Error(`not an rgb color: ${color}`);
	}
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function lightnessOf(color: string) {
	const [r, g, b] = channelsOf(color);
	return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
}

describe('the chip of a data color', () => {
	it('turns a pastel from the API into a light tint, a hairline and a dark ink of its hue', () => {
		// the light yellow "Backlog" status of the bench
		const chip = dataColorChipOf('#ffcc00', 'light');

		expect(chip).not.toBeNull();
		expect(lightnessOf(chip!.background)).toBeGreaterThan(0.9);
		expect(lightnessOf(chip!.ink)).toBeLessThan(0.4);
		expect(chip!.border).toMatch(/^rgba\(\d+, \d+, \d+, 0\.3\)$/);
		const [red, green, blue] = channelsOf(chip!.ink);
		expect(red).toBeGreaterThan(blue);
		expect(green).toBeGreaterThan(blue);
	});

	it('lifts a dark color to the same readable chip', () => {
		const chip = dataColorChipOf('#1f2937', 'light');

		expect(lightnessOf(chip!.background)).toBeGreaterThan(0.9);
		expect(lightnessOf(chip!.ink)).toBeLessThan(0.45);
	});

	it('draws a light ink on a translucent tint in dark mode', () => {
		const chip = dataColorChipOf('#3b82f6', 'dark');

		expect(chip!.background).toMatch(/^rgba\(\d+, \d+, \d+, 0\.2\)$/);
		expect(chip!.border).toMatch(/^rgba\(\d+, \d+, \d+, 0\.36\)$/);
		expect(lightnessOf(chip!.ink)).toBeGreaterThan(0.7);
	});

	it('reads short hex and rgb colors as the API sometimes sends them', () => {
		expect(dataColorChipOf('#fc0', 'light')).toEqual(dataColorChipOf('#ffcc00', 'light'));
		expect(dataColorChipOf('rgb(255, 204, 0)', 'light')).toEqual(dataColorChipOf('#ffcc00', 'light'));
	});

	it.each([[null], [undefined], [''], ['transparent'], ['not a color'], ['#12345'], ['rgb(300, 0, 0)']])(
		'gives no chip for %p, so the caller keeps its neutral look',
		(color) => {
			expect(dataColorChipOf(color, 'light')).toBeNull();
			expect(dataColorHueOf(color)).toBeNull();
		}
	);

	it('pins the lightness, so a light and a dark shade of one hue give the same chip', () => {
		const light = channelsOf(dataColorHueOf('#ffcc00')!);
		const dark = channelsOf(dataColorHueOf('#806600')!);

		light.forEach((channel, index) => expect(Math.abs(channel - dark[index])).toBeLessThanOrEqual(2));
	});

	it("draws the web's chip-3d gradient, lighter at the top in light mode", () => {
		const chip = dataColorChipOf('#ffcc00', 'light')!;

		const [top, bottom] = chip.gradient;
		expect(lightnessOf(top)).toBeGreaterThan(lightnessOf(bottom));
		expect(chip.innerLine).toMatch(/^rgba\(\d+, \d+, \d+, 0\.26\)$/);
		expect(chip.shadow).toMatch(/^rgba\(\d+, \d+, \d+, 0\.16\)$/);
	});

	it('draws the dark chip-3d with a faint top line and no shadow', () => {
		const chip = dataColorChipOf('#ffcc00', 'dark')!;

		expect(chip.gradient[0]).toMatch(/^rgba\(\d+, \d+, \d+, 0\.16\)$/);
		expect(chip.gradient[1]).toMatch(/^rgba\(\d+, \d+, \d+, 0\.24\)$/);
		expect(chip.innerLine).toBe('rgba(255, 255, 255, 0.06)');
		expect(chip.shadow).toBeNull();
	});

	it("reads the theme's hsl() colors, as the web reads any CSS color", () => {
		const fromHsl = dataColorChipOf('hsl(239, 84%, 67%)', 'light');

		expect(fromHsl).not.toBeNull();
		expect(fromHsl).toEqual(dataColorChipOf('rgb(100, 103, 242)', 'light'));
		expect(dataColorChipOf('hsl(239, 184%, 67%)', 'light')).toBeNull();
	});
});
