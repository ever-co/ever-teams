import { isClassicIcon, isCustomIcon } from './property-icon-value';

describe("a property's stored icon", () => {
	it('reads the icons Gauzy seeds as classic, with or without a leading slash', () => {
		expect(isClassicIcon('ever-icons/task-statuses/open.svg')).toBe(true);
		expect(isClassicIcon('/ever-icons/task-sizes/medium.svg')).toBe(true);
		expect(isCustomIcon('ever-icons/task-statuses/open.svg')).toBe(false);
	});

	it("reads anything else set as the user's own, and nothing as none", () => {
		expect(isCustomIcon('image-asset:asset-1:LOCAL:icons/rocket.png')).toBe(true);
		expect(isCustomIcon('hugeicons:rocket')).toBe(true);
		expect(isCustomIcon('')).toBe(false);
		expect(isCustomIcon(null)).toBe(false);
	});
});
