import { CellContext } from '@tanstack/react-table';
import { TaskTimes } from '../../../task-times';
import { ITask } from '@/core/types/interfaces/task/task';
import { I_UserProfilePage, useOrganizationTeams, useTeamMemberCard } from '@/core/hooks';
import get from 'lodash/get';
import { useMemo } from 'react';

export default function DailyPlanTaskTimesCell(props: CellContext<ITask, unknown>) {
	const profile = get(props.column, 'columnDef.meta.profile') as unknown as I_UserProfilePage;
	const { activeTeam } = useOrganizationTeams();
	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	const currentMember = useMemo(
		() =>
			members.find((m) => {
				return m.employee?.user?.id === profile?.userProfile?.id;
			}),
		[members, profile?.userProfile?.id]
	);
	const memberInfo = useTeamMemberCard(currentMember || undefined);

	return (
		<TaskTimes
			activeAuthTask={true}
			task={props.row.original}
			isAuthUser={true}
			className="flex flex-col gap-2"
			showTotal={true}
			memberInfo={memberInfo}
		/>
	);
}
