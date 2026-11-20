import { authCodeSlotLookOf, authHeadingLookOf, authLabelLookOf, authSubmitLookOf } from './auth-look';
import { themeFor } from './use-theme';

const dark = themeFor('dark');
const light = themeFor('light');

describe("sign-in's look", () => {
	it('titles a step 20 in the foreground, with its line in muted-foreground', () => {
		const heading = authHeadingLookOf(dark);

		expect(heading.title).toMatchObject({ color: dark.colors.foreground, fontSize: 20 });
		expect(heading.description).toMatchObject({ color: dark.colors['muted-foreground'], fontSize: 14 });
	});

	it('puts a 13 label in the foreground above a field', () => {
		expect(authLabelLookOf(light)).toMatchObject({ color: light.colors.foreground, fontSize: 13 });
	});

	it('draws the submit as a full-width primary pill 44 tall, faded while it cannot be pressed', () => {
		const ready = authSubmitLookOf(true, light);
		const waiting = authSubmitLookOf(false, light);

		expect(ready.button).toMatchObject({
			backgroundColor: light.colors.primary,
			borderRadius: light.radius.full,
			height: 44,
			opacity: 1,
			width: '100%'
		});
		expect(ready.labelColor).toBe(light.colors['primary-foreground']);
		expect(waiting.button.opacity).toBe(0.5);
	});

	it('outlines a code slot in the input color, in primary while it holds the focus', () => {
		expect(authCodeSlotLookOf(false, dark)).toMatchObject({ borderColor: dark.colors.input, height: 40 });
		expect(authCodeSlotLookOf(true, dark).borderColor).toBe(dark.colors.primary);
	});
});
