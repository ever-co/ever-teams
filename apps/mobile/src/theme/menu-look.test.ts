import { menuRowBackgroundOf, raisedSurfaceOf } from './menu-look';
import { themeFor } from './use-theme';

describe("the web's menu surface", () => {
	it('takes the popover color, radius 12 and the two light shadows of surface-raised', () => {
		const light = themeFor('light');

		const surface = raisedSurfaceOf(light);

		expect(surface).toMatchObject({ backgroundColor: light.colors.popover, borderRadius: 12 });
		expect(surface.boxShadow).toBe('0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 12px 32px -4px rgba(0, 0, 0, 0.1)');
	});

	it('takes the one deep shadow of surface-raised in dark mode', () => {
		expect(raisedSurfaceOf(themeFor('dark')).boxShadow).toBe('0 12px 32px -4px rgba(0, 0, 0, 0.5)');
	});

	it('tints a row only under the finger, at 5% of the text color', () => {
		const dark = themeFor('dark');

		expect(menuRowBackgroundOf(true, dark)).toBe(dark.foreground(5));
		expect(menuRowBackgroundOf(false, dark)).toBe('transparent');
	});
});
