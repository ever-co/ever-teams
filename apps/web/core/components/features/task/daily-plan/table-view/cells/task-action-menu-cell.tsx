import { ITeamTask } from '@/app/interfaces';
import { CellContext } from '@tanstack/react-table';
import { ActiveTaskStatusDropdown } from '../../../task-status';
import { useMemo, useState } from 'react';
import { I_UserProfilePage, useOrganizationTeams, useTeamMemberCard } from '@/app/hooks';
import { get } from 'lodash';
import { TaskCardMenu } from '../../../task-card';

export default function TaskActionMenuCell(props: CellContext<ITeamTask, unknown>) {
	const [loading, setLoading] = useState(false);
	const { activeTeam } = useOrganizationTeams();
	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	const profile = get(props.column, 'columnDef.meta.profile') as unknown as I_UserProfilePage;
	const plan = get(props.column, 'columnDef.meta.plan');
	const planMode = get(props.column, 'columnDef.meta.planMode');
	const currentMember = useMemo(
		() =>
			members.find((m) => {
				return m.employee.user?.id === profile?.userProfile?.id;
			}),
		[members, profile?.userProfile?.id]
	);
	const memberInfo = useTeamMemberCard(currentMember || undefined);

	return (
		<div className="flex items-center justify-center w-1/5 h-full xl:justify-between lg:px-3 2xl:w-52 3xl:w-80">
			{/* Active Task Status Dropdown (It's a dropdown that allows the user to change the status of the task.)*/}
			<div className="flex items-center justify-center ">
				<ActiveTaskStatusDropdown
					task={props.row.original}
					onChangeLoading={(load) => setLoading(load)}
					className="min-w-[10.625rem] text-sm"
				/>
			</div>
			{/* TaskCardMenu */}
			<div className="flex items-end justify-end mt-2 shrink-0 xl:mt-0 text-start">
				{props.row.original && currentMember && (
					<TaskCardMenu
						task={props.row.original}
						loading={loading}
						memberInfo={memberInfo}
						viewType={'default'}
						profile={profile}
						plan={plan}
						planMode={planMode}
					/>
				)}
			</div>
		</div>
	);
}
