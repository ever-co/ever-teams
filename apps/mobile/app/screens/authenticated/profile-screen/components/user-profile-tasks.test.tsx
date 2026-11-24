import React from 'react';
import { render } from '@testing-library/react-native';
import UserProfileTasks from './user-profile-tasks';
import type { IUserProfile } from '../logics/use-profile-screen-logic';
import type { ITaskFilter } from '../../../../services/hooks/features/use-task-filters';
import type { ITeamTask } from '../../../../services/interfaces/ITask';

// The cards stand in as the props they were given: the list decides which card is the running task's
const mockCards: Array<{ task: ITeamTask; activeAuthTask: boolean }> = [];
jest.mock('./list-card-item', () => ({
	__esModule: true,
	default: (props: { task: ITeamTask; activeAuthTask: boolean }) => {
		mockCards.push({ task: props.task, activeAuthTask: props.activeAuthTask });
		return null;
	}
}));
jest.mock('../../../../components/worked-day-hours', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../../models', () => ({ useStores: () => ({ TaskStore: { activeTaskId: 'task-repaint' } }) }));
jest.mock('../../../../services/hooks/use-timer', () => ({ useTimer: () => ({ timerStatus: { running: true } }) }));
jest.mock('../../../../i18n', () => ({ translate: (key: string) => key }));
jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useAppTheme: () => ({ colors: { primary: '#000', background2: '#fff' }, dark: false })
}));

const repaint = { id: 'task-repaint', title: 'Repaint maintenance hatch' } as ITeamTask;
const inspect = { id: 'task-inspect', title: 'Inspect north pier bolts' } as ITeamTask;

describe("the Assigned tab of one's own tasks", () => {
	it("marks the running task's card, so its ring and its timer button follow the run", async () => {
		const profile = { isAuthUser: true } as IUserProfile;
		const content = { tab: 'assigned', tasksFiltered: [repaint, inspect] } as unknown as ITaskFilter;

		await render(<UserProfileTasks profile={profile} content={content} />);

		const runningCard = mockCards.find((card) => card.task.id === 'task-repaint');
		const otherCard = mockCards.find((card) => card.task.id === 'task-inspect');
		expect(runningCard?.activeAuthTask).toBe(true);
		expect(otherCard?.activeAuthTask).toBe(false);
	});
});
