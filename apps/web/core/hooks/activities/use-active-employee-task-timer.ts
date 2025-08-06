import { activeTeamTaskId, userState } from '@/core/stores';
import { useAtomValue } from 'jotai';

export function useActiveEmployeeTaskTimer() {
	const currentUser = useAtomValue(userState);

	const currentEmployee = currentUser?.employee;

	const activeTaskId = useAtomValue(activeTeamTaskId);

	const timeSpentOnActiveTaskByEmployee = 0;
}
