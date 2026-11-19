import { renderHook } from '@testing-library/react-native';
import { useActiveUserTask } from './use-active-user-task';
import type { ITeamTask } from '../../../../services/interfaces/ITask';

const repaint = { id: 'task-repaint', title: 'Repaint maintenance hatch' } as ITeamTask;
const inspect = { id: 'task-inspect', title: 'Inspect north pier bolts' } as ITeamTask;

type Args = { isAuthUser: boolean; activeTask?: ITeamTask; lastWorkedTask?: ITeamTask };

function renderActiveUserTask(initialProps: Args) {
	return renderHook(
		({ isAuthUser, activeTask, lastWorkedTask }: Args) => useActiveUserTask(isAuthUser, activeTask, lastWorkedTask),
		{ initialProps }
	);
}

describe("the task under Now on a person's Tasks tab", () => {
	it("shows the timer's task on one's own tab once it arrives after the tab is drawn", async () => {
		const { result, rerender } = await renderActiveUserTask({ isAuthUser: true });
		expect(result.current).toBeUndefined();

		await rerender({ isAuthUser: true, activeTask: repaint });

		expect(result.current).toBe(repaint);
	});

	it("shows the last worked task on someone else's tab, and follows it", async () => {
		const { result, rerender } = await renderActiveUserTask({
			isAuthUser: false,
			activeTask: repaint,
			lastWorkedTask: inspect
		});
		expect(result.current).toBe(inspect);

		await rerender({ isAuthUser: false, activeTask: repaint, lastWorkedTask: repaint });

		expect(result.current).toBe(repaint);
	});
});
