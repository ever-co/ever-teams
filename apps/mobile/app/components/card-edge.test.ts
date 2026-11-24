import { cardEdgeOf } from './card-edge';
import { themeFor } from '../../src/theme/use-theme';

describe("a member card's hairline", () => {
	it("marks the person's own card in the primary color", () => {
		expect(cardEdgeOf(true, themeFor('light'))).toBe(themeFor('light').colors.primary);
	});

	it("keeps the border color on everyone else's card", () => {
		expect(cardEdgeOf(false, themeFor('dark'))).toBe(themeFor('dark').colors.border);
	});
});
