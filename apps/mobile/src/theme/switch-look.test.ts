import { webSwitchLookOf } from './switch-look';
import { themeFor } from './use-theme';

describe("the web's switch", () => {
	it.each(['light', 'dark'] as const)('is a 42 x 24 track, primary when on, with a white 18 knob (%s)', (scheme) => {
		const theme = themeFor(scheme);

		const look = webSwitchLookOf(theme);

		expect(look.track).toMatchObject({ width: 42, height: 24, backgroundColor: theme.foreground(10) });
		expect(look.onFill.backgroundColor).toBe(theme.colors.primary);
		expect(look.knob).toMatchObject({ width: 18, height: 18 });
		expect(look.knobColor).toBe('#FFFFFF');
	});
});
