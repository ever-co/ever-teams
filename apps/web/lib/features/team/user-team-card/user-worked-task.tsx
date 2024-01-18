import { useUserDetails } from '@app/hooks/features/useUserDetails';
import { activityTypeState } from '@app/stores/activity-type';
import { useTaskFilter } from 'lib/features/task/task-filters';
import { UserProfileTask } from 'lib/features/user-profile-tasks';
import { useRecoilValue } from 'recoil';

export function UserWorkedTaskTab() {
	const activityFilter = useRecoilValue(activityTypeState);
	const profile = useUserDetails(activityFilter.member?.employeeId ?? '');
	const hook = useTaskFilter(profile);

	return <UserProfileTask profile={profile} tabFiltered={hook} />;
}
