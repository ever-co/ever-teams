import { useTimer } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { getTimerStatusValue } from '@/core/components/timer/timer-status';
import { useMemo } from 'react';
import MemberBoxInfo from './user-info';
import { BlockCardMemberTodayWorked } from './user-team-today-worked';
import UserTeamActiveBlockTaskInfo from './user-team-active-task';
import UserTeamActiveTaskTimesBlock from './user-team-active-task-times';
import UserTeamActiveTaskEstimateBlock from './user-team-task-estimate';
import { EverCard } from '@/core/components/common/ever-card';
import { HorizontalSeparator } from '@/core/components/duplicated-components/separator';
import { ETimerStatus } from '@/core/types/generics/enums/timer';

const cardColorType = {
	running: ' border-green-300',
	idle: ' border-[#F5BEBE]',
	online: ' border-green-300',
	pause: ' border-[#EFCF9E]',
	suspended: ' border-[#DCD6D6]'
};

// export interface Member extends IOrganizationTeamEmployee {
// 	teams: { team: IOrganizationTeam; activeTaskId?: string | null }[];
// 	user?: IUser;
// 	userId?: ID;
// 	totalTodayTasks?: ITasksStatistics[];
// }

export default function UserTeamBlockCard({ member }: { member: any }) {
	const { timerStatus } = useTimer();

	const timerStatusValue: ETimerStatus = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, true);
	}, [timerStatus, member]);

	return (
		<div className={clsxm('border-2 border-transparent')}>
			<EverCard
				shadow="bigger"
				className={clsxm('relative items-center py-3 !px-4 dark:bg-[#1E2025] min-h-[7rem]', [
					'dark:border border-t-[6px] dark:border-t-[6px] max-w-[370px]',
					cardColorType[timerStatusValue]
				])}
			>
				<div className="flex items-center justify-between w-full py-2">
					<MemberBoxInfo member={member} />
					{/* total time  */}
					<div className="flex items-center justify-end w-2/5 gap-1">
						<BlockCardMemberTodayWorked member={member} />
						{/* <div className="w-2 right-2">{menu}</div> */}
					</div>
				</div>

				<HorizontalSeparator />

				<>
					{member.teams.map((team: any) => (
						<div key={member.employeeId}>
							<>
								<div className="my-3 font-semibold">{team.team.name}</div>
								<UserTeamActiveBlockTaskInfo member={member} activeTaskId={team.activeTaskId || ''} />

								<HorizontalSeparator />
								<div className="flex items-center justify-between w-full py-2">
									<div className="flex items-center justify-start">
										<UserTeamActiveTaskTimesBlock
											member={member}
											activeTaskId={team.activeTaskId || ''}
										/>
									</div>
									<UserTeamActiveTaskEstimateBlock
										member={member}
										activeTaskId={team.activeTaskId || ''}
									/>
								</div>
							</>
						</div>
					))}
				</>
			</EverCard>
		</div>
	);
}
