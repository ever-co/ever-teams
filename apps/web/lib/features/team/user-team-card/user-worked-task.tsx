import { useUserDetails } from '@app/hooks/features/useUserDetails';
import { useTaskFilter } from 'lib/features/task/task-filters';
import { UserProfileTask } from 'lib/features/user-profile-tasks';

export function UserWokedTaskTab({ id }: { id: string }) {
	const profile = useUserDetails(id);
	const hook = useTaskFilter(profile);

	return <UserProfileTask profile={profile} tabFiltered={hook} />;
}
