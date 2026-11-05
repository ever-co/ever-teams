import { getTimerStatusValue } from '@/core/components/timer/timer-status';
import { useMemo } from 'react';
import MemberBoxInfo from './user-info';
import { BlockCardMemberTodayWorked } from './user-team-today-worked';
import UserTeamActiveBlockTaskInfo from './user-team-active-task';
import UserTeamActiveTaskTimesBlock from './user-team-active-task-times';
import UserTeamActiveTaskEstimateBlock from './user-team-task-estimate';
import { MemberStatusChip } from '../../../team/team-members-views/user-team-block/member-status-chip';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';

const BLOCK_SURFACE_CLASS_NAME =
	'flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground hairline-ring ring-border shadow-sm shadow-black/6.5';

const TIMES_CELL_CLASS_NAME = 'flex min-w-0 items-center justify-center px-2 py-3';

// export interface Member extends IOrganizationTeamEmployee {
// 	teams: { team: IOrganizationTeam; activeTaskId?: string | null }[];
// 	user?: IUser;
// 	userId?: ID;
// 	totalTodayTasks?: TTaskStatistics[];
// }

/** One member across the teams they belong to: a header row, then one task section per team. */
export default function UserTeamBlockCard({ member }: { member: any }) {
	const timerStatus = useAtomValue(timerStatusState);
	const timerStatusValue: ETimerStatus = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, true);
	}, [timerStatus, member]);

	return (
		<div className={BLOCK_SURFACE_CLASS_NAME}>
			<div className="flex items-center justify-between gap-3 px-4 py-3">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<MemberBoxInfo member={member} />
					<MemberStatusChip status={timerStatusValue} />
				</div>
				{/* total time  */}
				<div className="flex shrink-0 items-center justify-end">
					<BlockCardMemberTodayWorked member={member} />
					{/* <div className="right-2 w-2">{menu}</div> */}
				</div>
			</div>

			{member.teams.map((team: any, index: number) => (
				<div key={team.team?.id ?? index} className="hairline-t border-dashed border-border">
					<div className="px-4 pt-3 text-xs font-medium text-muted-foreground">{team.team?.name}</div>
					<UserTeamActiveBlockTaskInfo activeTaskId={team.activeTaskId || ''} />

					<div className="grid grid-cols-2 hairline-divide-x divide-dashed divide-border hairline-t border-dashed border-border">
						<div className={TIMES_CELL_CLASS_NAME}>
							<UserTeamActiveTaskTimesBlock member={member} activeTaskId={team.activeTaskId || ''} />
						</div>
						<div className={TIMES_CELL_CLASS_NAME}>
							<UserTeamActiveTaskEstimateBlock member={member} activeTaskId={team.activeTaskId || ''} />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
