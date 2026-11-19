import { presenceColorOf } from './presence';
import { hsl, webColorTokens } from './tokens';
import { themeFor } from './use-theme';

const light = themeFor('light');

describe("a member's presence", () => {
	it('shows working in the success color', () => {
		expect(presenceColorOf('online', light)).toBe(light.colors.success);
		expect(presenceColorOf('running', light)).toBe(light.colors.success);
	});

	it('shows a pause in the warning color', () => {
		expect(presenceColorOf('pause', light)).toBe(light.colors.warning);
	});

	it('shows idle in muted gray, never in red', () => {
		const idle = presenceColorOf('idle', light);

		expect(idle).toBe(hsl(webColorTokens.light['muted-foreground'], 0.6));
		expect(idle).not.toBe(light.colors.destructive);
	});

	it('shows suspended fainter than idle', () => {
		expect(presenceColorOf('suspended', themeFor('dark'))).toBe(hsl(webColorTokens.dark['muted-foreground'], 0.3));
	});
});
