import { readFileSync } from 'fs';
import { resolve } from 'path';

const MOBILE = resolve(__dirname, '../..');

// Screens drawn with the web's icon family; an Expo icon font coming back into one of them is a regression
const ON_HUGEICONS: string[] = [
	'app/screens/authenticated/setting-screen/components/change-team-logo.tsx',
	'app/screens/authenticated/setting-screen/components/change-user-avatar.tsx',
	'app/screens/authenticated/setting-screen/components/language-form.tsx',
	'app/screens/authenticated/setting-screen/components/language-modal.tsx',
	'app/screens/authenticated/setting-screen/components/setting-header.tsx',
	'app/screens/authenticated/setting-screen/components/timezone-popup.tsx',
	'app/screens/authenticated/setting-screen/components/user-timezone.tsx'
];

describe("the screens on the web's icon family", () => {
	it.each(ON_HUGEICONS)('%s draws no Expo icon font', (path) => {
		const source = readFileSync(resolve(MOBILE, path), 'utf8');

		expect(source).not.toMatch(/@expo\/vector-icons/);
	});
});
