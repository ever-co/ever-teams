import { CellContext } from '@tanstack/react-table';
import { TaskTimes } from '../../../task-times';
import { I_UserProfilePage, useTeamMemberCard } from '@/core/hooks';
import get from 'lodash/get';
import { useMemo } from 'react';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';

export default function DailyPlanTaskTimesCell(props: CellContext<TTask, unknown>) {
	const profile = get(props.column, 'columnDef.meta.profile') as unknown as I_UserProfilePage;

	const activeTeam = useAtomValue(activeTeamState);
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
