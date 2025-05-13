import { useTimer } from '@/core/hooks';
import { IOrganizationTeamList, ITimerStatusEnum, OT_Member } from '@/core/types/interfaces';
import { clsxm } from '@/core/lib/utils';
import { Card, HorizontalSeparator } from '@/core/components';
import { getTimerStatusValue } from '@/core/components/timer/timer-status';
import { useMemo } from 'react';
import MemberBoxInfo from './user-info';
import { BlockCardMemberTodayWorked } from './user-team-today-worked';
import UserTeamActiveBlockTaskInfo from './user-team-active-task';
import UserTeamActiveTaskTimesBlock from './user-team-active-task-times';
import UserTeamActiveTaskEstimateBlock from './user-team-task-estimate';

const cardColorType = {
	running: ' border-green-300',
	idle: ' border-[#F5BEBE]',
	online: ' border-green-300',
	pause: ' border-[#EFCF9E]',
	suspended: ' border-[#DCD6D6]'
};

interface Member extends OT_Member {
	teams: { team: IOrganizationTeamList; activeTaskId?: string | null }[];
}

export default function UserTeamBlockCard({ member }: { member: Member }) {
	const { timerStatus } = useTimer();

	const timerStatusValue: ITimerStatusEnum = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, true);
	}, [timerStatus, member]);

	return (
		<div className={clsxm('border-2 border-transparent')}>
			<Card
				shadow="bigger"
				className={clsxm('relative items-center py-3 !px-4 dark:bg-[#1E2025] min-h-[7rem]', [
					'dark:border border-t-[6px] dark:border-t-[6px] max-w-[370px]',
					cardColorType[timerStatusValue]
				])}
			>
				<div className="flex items-center justify-between py-2 w-full">
					<MemberBoxInfo member={member} />
					{/* total time  */}
					<div className="flex items-center justify-end w-2/5 gap-1">
						<BlockCardMemberTodayWorked member={member} />
						{/* <div className="w-2 right-2">{menu}</div> */}
					</div>
				</div>

				<HorizontalSeparator />

				<>
					{member.teams.map((team) => (
						<div key={member.employeeId}>
							<>
								<div className="my-3 font-semibold">{team.team.name}</div>
								<UserTeamActiveBlockTaskInfo member={member} activeTaskId={team.activeTaskId || ''} />

								<HorizontalSeparator />
								<div className="w-full flex justify-between items-center py-2">
									<div className="flex justify-start items-center">
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
			</Card>
		</div>
	);
}
