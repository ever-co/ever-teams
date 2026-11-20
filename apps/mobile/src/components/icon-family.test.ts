import { readFileSync } from 'fs';
import { resolve } from 'path';

const MOBILE = resolve(__dirname, '../..');

// Screens drawn with the web's icon family; an Expo icon font coming back into one of them is a regression
const ON_HUGEICONS: string[] = [
	'app/components/home-header.tsx',
	'app/components/no-team.tsx',
	'app/components/task-epic-popup.tsx',
	'app/components/task-epic.tsx',
	'app/components/team-dropdown/drop-down-section.tsx',
	'app/components/timer-actions-menu.tsx',
	'app/navigators/tab-bar.tsx',
	'app/screens/authenticated/members-settings-screen/components/change-role-modal.tsx',
	'app/screens/authenticated/members-settings-screen/index.tsx',
	'app/screens/authenticated/profile-screen/components/task-label-filter.tsx',
	'app/screens/authenticated/profile-screen/components/task-priority-filter.tsx',
	'app/screens/authenticated/profile-screen/components/task-size-filter.tsx',
	'app/screens/authenticated/profile-screen/components/task-status-filter.tsx',
	'app/screens/authenticated/profile-screen/components/task-title-display.tsx',
	'app/screens/authenticated/setting-screen/components/change-team-logo.tsx',
	'app/screens/authenticated/setting-screen/components/change-user-avatar.tsx',
	'app/screens/authenticated/setting-screen/components/language-form.tsx',
	'app/screens/authenticated/setting-screen/components/language-modal.tsx',
	'app/screens/authenticated/setting-screen/components/setting-header.tsx',
	'app/screens/authenticated/setting-screen/components/timezone-popup.tsx',
	'app/screens/authenticated/setting-screen/components/user-timezone.tsx',
	'app/screens/authenticated/team-screen/components/task-info.tsx',
	'app/screens/authenticated/timer-screen/components/combo-box.tsx',
	'app/screens/authenticated/timer-screen/components/estimate-time.tsx',
	'app/screens/authenticated/timer-screen/components/individual-task.tsx',
	'app/screens/authenticated/timer-screen/components/task-display-box.tsx',
	'app/screens/authenticated/timer-screen/components/task-status-dropdown.tsx',
	'app/screens/authenticated/timer-screen/components/timer-task-section.tsx',
	'src/components/run-button.tsx',
	'src/home/today-tasks.tsx'
];

describe("the screens on the web's icon family", () => {
	it.each(ON_HUGEICONS)('%s draws no Expo icon font', (path) => {
		const source = readFileSync(resolve(MOBILE, path), 'utf8');

		expect(source).not.toMatch(/@expo\/vector-icons/);
	});
});
