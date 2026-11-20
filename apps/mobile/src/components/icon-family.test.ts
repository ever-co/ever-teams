import { readFileSync } from 'fs';
import { resolve } from 'path';

const MOBILE = resolve(__dirname, '../..');

// Screens drawn with the web's icon family; an Expo icon font coming back into one of them is a regression
const ON_HUGEICONS: string[] = [
	'app/components/accordion.tsx',
	'app/components/hamburger-menu.tsx',
	'app/components/home-header.tsx',
	'app/components/menu-row.tsx',
	'app/components/no-team.tsx',
	'app/components/task-epic-popup.tsx',
	'app/components/task-epic.tsx',
	'app/components/task-labels.tsx',
	'app/components/task-priority.tsx',
	'app/components/task-size.tsx',
	'app/components/task-status.tsx',
	'app/components/task-version.tsx',
	'app/components/task/details-block/blocks/task-main-info.tsx',
	'app/components/task/details-block/components/property-label.tsx',
	'app/components/task/estimate-block/index.tsx',
	'app/components/task/linked-issues-block/blocks/child-issues.tsx',
	'app/components/task/linked-issues-block/blocks/related-issues.tsx',
	'app/components/task/linked-issues-block/components/action-types-modal.tsx',
	'app/components/task/linked-issues-block/components/create-linked-issue-modal.tsx',
	'app/components/task/time-block/index.tsx',
	'app/components/task/title-block/create-parent-task-modal.tsx',
	'app/components/task/title-block/icon-button.tsx',
	'app/components/task/title-block/index.tsx',
	'app/components/team-dropdown/drop-down-section.tsx',
	'app/components/team-dropdown/drop-down.tsx',
	'app/components/timer-actions-menu.tsx',
	'app/navigators/tab-bar.tsx',
	'app/screens/authenticated/members-settings-screen/components/change-role-modal.tsx',
	'app/screens/authenticated/members-settings-screen/index.tsx',
	'app/screens/authenticated/profile-screen/components/list-card-item.tsx',
	'app/screens/authenticated/profile-screen/components/task-title-display.tsx',
	'app/screens/authenticated/setting-screen/components/change-team-logo.tsx',
	'app/screens/authenticated/setting-screen/components/change-user-avatar.tsx',
	'app/screens/authenticated/setting-screen/components/language-form.tsx',
	'app/screens/authenticated/setting-screen/components/language-modal.tsx',
	'app/screens/authenticated/setting-screen/components/setting-header.tsx',
	'app/screens/authenticated/setting-screen/components/timezone-popup.tsx',
	'app/screens/authenticated/setting-screen/components/user-timezone.tsx',
	'app/screens/authenticated/task-screen/index.tsx',
	'app/screens/authenticated/team-screen/components/invite-card-item.tsx',
	'app/screens/authenticated/team-screen/components/list-card-item.tsx',
	'app/screens/authenticated/team-screen/components/task-info.tsx',
	'app/screens/authenticated/timer-screen/components/combo-box.tsx',
	'app/screens/authenticated/timer-screen/components/estimate-time.tsx',
	'app/screens/authenticated/timer-screen/components/individual-task.tsx',
	'app/screens/authenticated/timer-screen/components/task-display-box.tsx',
	'app/screens/authenticated/timer-screen/components/task-status-dropdown.tsx',
	'app/screens/authenticated/timer-screen/components/timer-task-section.tsx',
	'app/screens/login-screen/components/sign-in-step.tsx',
	'src/components/run-button.tsx',
	'src/home/today-tasks.tsx'
];

describe("the screens on the web's icon family", () => {
	it.each(ON_HUGEICONS)('%s draws no Expo icon font', (path) => {
		const source = readFileSync(resolve(MOBILE, path), 'utf8');

		expect(source).not.toMatch(/@expo\/vector-icons/);
	});
});
