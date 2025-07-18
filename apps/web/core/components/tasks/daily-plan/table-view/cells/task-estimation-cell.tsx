import { TaskEstimateInfo } from '@/core/components/pages/teams/team/team-members-views/user-team-card/task-estimate';
import { I_UserProfilePage, useOrganizationTeams, useTeamMemberCard, useTMCardTaskEdit } from '@/core/hooks';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { CellContext } from '@tanstack/react-table';
import { get } from 'lodash';
import { useMemo } from 'react';

export default function DailyPlanTaskEstimationCell(props: CellContext<TTask, unknown>) {
	const plan = get(props.column, 'columnDef.meta.plan');
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
	const taskEdition = useTMCardTaskEdit(props.row.original);

	return <TaskEstimateInfo plan={plan} memberInfo={memberInfo} edition={taskEdition} activeAuthTask={true} />;
}
