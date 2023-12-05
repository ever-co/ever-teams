import { secondsToTime } from '@app/helpers';
import { I_TeamMemberCardHook, useOrganizationTeams } from '@app/hooks';
import { IClassName, ITeamTask, Nullable, OT_Member } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { useTranslation } from 'react-i18next';

type Props = {
	task: Nullable<ITeamTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	memberInfo?: I_TeamMemberCardHook | OT_Member | any;
	showDaily?: boolean;
	showTotal?: boolean;
	isBlock?: boolean;
} & IClassName;

export function TaskTimes({ className, task, memberInfo, showDaily = true, showTotal = true, isBlock = false }: Props) {
	// For public page
	const { activeTeam } = useOrganizationTeams();
	const currentMember = activeTeam?.members.find((member) => member.id === memberInfo?.member?.id || memberInfo?.id);

	const { h, m } = secondsToTime(
		(currentMember?.totalWorkedTasks &&
			currentMember?.totalWorkedTasks?.length &&
			currentMember?.totalWorkedTasks
				.filter((t) => t.id === task?.id)
				.reduce((previousValue, currentValue) => previousValue + currentValue.duration, 0)) ||
			0
	);
	const { h: dh, m: dm } = secondsToTime(
		(currentMember?.totalTodayTasks &&
			currentMember?.totalTodayTasks.length &&
			currentMember?.totalTodayTasks
				.filter((t) => t.id === task?.id)
				.reduce((previousValue, currentValue) => previousValue + currentValue.duration, 0)) ||
			0
	);

	return (
		<div className={clsxm(className)}>
			{isBlock ? (
				<TimeBlockInfo showDaily={showDaily} showTotal={showTotal} daily={{ h: dh, m: dm }} total={{ h, m }} />
			) : (
				<TimeInfo showDaily={showDaily} showTotal={showTotal} daily={{ h: dh, m: dm }} total={{ h, m }} />
			)}
		</div>
	);
}

function TimeInfo({
	daily,
	total,
	showDaily = true,
	showTotal = true
}: {
	daily: { h: number; m: number };
	total: { h: number; m: number };
	showDaily?: boolean;
	showTotal?: boolean;
}) {
	const { t } = useTranslation();
	return (
		<>
			{showDaily && (
				<div className="flex items-center space-x-2 text-base font-normal">
					<span className="text-[#7B8089]">{t('common.TODAY')}:</span>
					<Text>
						{daily.h}h : {daily.m}m
					</Text>
				</div>
			)}

			{showTotal && (
				<div
					className={clsxm(
						'flex space-x-4 items-center font-normal text-sm'
						// showDaily && ['text-sm']
					)}
				>
					<span className="text-[#7B8089]">{t('common.TOTAL')}:</span>
					<Text>
						{total.h}h : {total.m}m
					</Text>
				</div>
			)}
		</>
	);
}

function TimeBlockInfo({
	daily,
	total,
	showDaily = true,
	showTotal = true
}: {
	daily: { h: number; m: number };
	total: { h: number; m: number };
	showDaily?: boolean;
	showTotal?: boolean;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex gap-5">
			{showDaily && (
				<div className=" text-base font-normal flex flex-col items-center ">
					<span className="text-[#7B8089]">{t('common.TODAY')}:</span>
					<Text className="text-lg font-semibold">
						{daily.h}h : {daily.m}m
					</Text>
				</div>
			)}

			{showTotal && (
				<div
					className={clsxm(
						'font-normal text-base flex flex-col items-center '
						// showDaily && ['text-sm']
					)}
				>
					<span className="text-[#7B8089]">{t('common.TOTAL')}:</span>
					<Text className="text-lg font-semibold">
						{total.h}h : {total.m}m
					</Text>
				</div>
			)}
		</div>
	);
}

export function TodayWorkedTime({ className, memberInfo }: Omit<Props, 'task' | 'activeAuthTask'>) {
	// Get current timer seconds
	const { activeTeam } = useOrganizationTeams();

	const currentMember = activeTeam?.members.find((member) => member.id === memberInfo?.member?.id);
	const { h, m } = secondsToTime(
		(currentMember?.totalTodayTasks &&
			currentMember?.totalTodayTasks.reduce(
				(previousValue, currentValue) => previousValue + currentValue.duration,
				0
			)) ||
			0
	);

	return (
		<div className={clsxm('text-center font-normal', className)}>
			<Text>
				{h ? h : '0'}h : {m ? m : '0'}m
			</Text>
		</div>
	);
}
