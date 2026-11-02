'use client';

import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { ChevronDown, Plus } from '@/core/components/icons';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { LimitMeter, ShareMeter } from '@/core/components/dashboards/kit/meters';
import { TaskEstimate } from '@/core/components/tasks/task-estimate';
import { TaskMemberEstimate } from '@/core/components/tasks/task-member-estimate';
import { TaskPropertyMenu, type TaskPropertyMenuOption } from '@/core/components/tasks/task-property-menu';
import { PersonAvatar, personFromTeamMember } from '@/core/components/teams/people-avatars';
import { useTaskTimeFigures } from '@/core/hooks/tasks/use-task-time-figures';
import { cn } from '@/core/lib/helpers';
import { formatWorkedTime, type TaskMemberTime } from '@/core/lib/utils/task-detail';
import { activeTeamState } from '@/core/stores';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TCreateTaskEstimation, TTaskEstimation } from '@/core/types/schemas/task/task-estimation.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_GHOST_ACTION } from './task-detail-recipes';

const VISIBLE_MEMBERS = 3;

function shareOf(seconds: number, total: number) {
	if (total <= 0) {
		return 0;
	}
	return (seconds * 100) / total;
}

function EstimateVerdict({ estimate, worked }: Readonly<{ estimate: number; worked: number }>) {
	const t = useTranslations();
	const difference = estimate - worked;
	const isOver = difference < 0;
	if (isOver) {
		return (
			<span className="text-xs text-destructive-ink">
				{t('taskDetail.time.OVER', { time: formatWorkedTime(Math.abs(difference)) })}
			</span>
		);
	}
	return (
		<span className="text-xs text-muted-foreground">
			{t('taskDetail.time.LEFT', { time: formatWorkedTime(difference) })}
		</span>
	);
}

function MemberTimeRow({ member, total }: Readonly<{ member: TaskMemberTime; total: number }>) {
	const person = { id: member.id, name: member.name, imageUrl: member.imageUrl };
	return (
		<li className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-center gap-2.5 py-1">
			<span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
				<PersonAvatar person={person} className="size-5 text-[9px] ring-0" />
				<span className="truncate">{member.name}</span>
			</span>
			<ShareMeter share={shareOf(member.seconds, total)} />
			<span className="w-14 text-right text-[13px] font-medium tabular-nums text-foreground">
				{formatWorkedTime(member.seconds)}
			</span>
		</li>
	);
}

function MemberTimes({ members, total }: Readonly<{ members: TaskMemberTime[]; total: number }>) {
	const t = useTranslations();
	const [showsAll, setShowsAll] = useState(false);
	const hiddenCount = members.length - VISIBLE_MEMBERS;
	const hasHidden = hiddenCount > 0;
	let shown = members;
	if (!showsAll) {
		shown = members.slice(0, VISIBLE_MEMBERS);
	}
	const showsToggle = hasHidden && !showsAll;
	return (
		<div className="flex flex-col">
			<ul className="flex flex-col">
				{shown.map((member) => (
					<MemberTimeRow key={member.id} member={member} total={total} />
				))}
			</ul>
			{showsToggle && (
				<button
					type="button"
					onClick={() => setShowsAll(true)}
					className={cn(DETAIL_GHOST_ACTION, '-ml-2 w-fit')}
				>
					{t('taskDetail.time.SHOW_MORE_MEMBERS', { count: hiddenCount })}
				</button>
			)}
		</div>
	);
}

function memberOfEmployee(members: TOrganizationTeamEmployee[], employeeId: string) {
	return members.find((member) => member.employee?.id === employeeId) ?? null;
}

function EstimationRow({
	member,
	estimation
}: Readonly<{ member: TOrganizationTeamEmployee | null; estimation: TTaskEstimation | TCreateTaskEstimation }>) {
	const t = useTranslations();
	let name: string = t('taskDrawer.SOMEONE');
	let avatar = null;
	if (member) {
		const person = personFromTeamMember(member);
		name = person.name;
		avatar = <PersonAvatar person={person} className="size-5 text-[9px] ring-0" />;
	}
	return (
		<li className="flex min-h-8 items-center justify-between gap-2">
			<span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
				{avatar}
				<span className="truncate">{name}</span>
			</span>
			<TaskMemberEstimate
				taskEstimation={estimation}
				className="text-xs font-medium text-muted-foreground gap-1"
			/>
		</li>
	);
}

function estimationOptionOf(member: TOrganizationTeamEmployee): TaskPropertyMenuOption<TOrganizationTeamEmployee> {
	const person = personFromTeamMember(member);
	return {
		key: member.id,
		value: member,
		label: person.name,
		icon: <PersonAvatar person={person} className="size-4 text-[8px] ring-0" />
	};
}

function MemberEstimations({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const teamMembers = useMemo(() => activeTeam?.members ?? [], [activeTeam?.members]);
	const [addedEmployeeId, setAddedEmployeeId] = useState<string | null>(null);
	const estimations = task.estimations ?? [];
	const estimatedIds = new Set(estimations.map((estimation) => estimation.employeeId));
	const candidates = teamMembers.filter((member) => {
		const employeeId = member.employee?.id;
		const hasEmployee = Boolean(employeeId);
		const isEstimated = estimatedIds.has(employeeId ?? '');
		return hasEmployee && !isEstimated;
	});
	const options = candidates.map(estimationOptionOf);
	let newEstimationEmployeeId: string | null = null;
	const isAddedMemberNew = !estimatedIds.has(addedEmployeeId ?? '');
	if (addedEmployeeId && isAddedMemberNew) {
		newEstimationEmployeeId = addedEmployeeId;
	}

	return (
		<div className="flex flex-col gap-1">
			<ul className="flex flex-col">
				{estimations.map((estimation) => (
					<EstimationRow
						key={estimation.id ?? estimation.employeeId}
						member={memberOfEmployee(teamMembers, estimation.employeeId)}
						estimation={estimation}
					/>
				))}
				{newEstimationEmployeeId && (
					<EstimationRow
						member={memberOfEmployee(teamMembers, newEstimationEmployeeId)}
						estimation={{ employeeId: newEstimationEmployeeId, estimate: 0, taskId: task.id }}
					/>
				)}
			</ul>
			{options.length > 0 && (
				<TaskPropertyMenu
					options={options}
					isSelected={() => false}
					onSelect={(member) => setAddedEmployeeId(member.employee?.id ?? null)}
					searchPlaceholder={t('taskDetail.properties.SEARCH_PEOPLE')}
					triggerLabel={t('taskDetail.time.ADD_MEMBER_ESTIMATE')}
					triggerClassName="w-fit rounded-md"
					popupClassName="w-64"
				>
					<span className={cn(DETAIL_GHOST_ACTION, '-ml-2')}>
						<Plus aria-hidden="true" />
						{t('taskDetail.time.ADD_MEMBER_ESTIMATE')}
					</span>
				</TaskPropertyMenu>
			)}
		</div>
	);
}

function EstimateEditor({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const [showsMembers, setShowsMembers] = useState(false);
	const count = task.estimations?.length ?? 0;
	return (
		<div className="flex flex-col gap-1">
			<div className="flex min-h-8 items-center justify-between gap-2">
				<span className="text-[13px] text-muted-foreground">{t('common.ESTIMATE')}</span>
				<TaskEstimate _task={task} useActiveTeamTaskByDefault={false} />
			</div>
			<button
				type="button"
				aria-expanded={showsMembers}
				onClick={() => setShowsMembers((open) => !open)}
				className={cn(DETAIL_GHOST_ACTION, '-ml-2 w-fit')}
			>
				{t('taskDetail.time.PER_MEMBER', { count })}
				<ChevronDown
					aria-hidden="true"
					className={cn('transition-transform duration-200', !showsMembers && '-rotate-90')}
				/>
			</button>
			<AnimatedHeight swapKey={String(showsMembers)}>
				{showsMembers && <MemberEstimations task={task} />}
			</AnimatedHeight>
		</div>
	);
}

export function TaskDetailTime({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const figures = useTaskTimeFigures(task);
	const estimate = task.estimate ?? 0;
	const hasEstimate = estimate > 0;
	const hasOwnTime = figures.ownSeconds > 0;
	const hasMembers = figures.members.length > 0;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<div className="flex flex-wrap items-baseline gap-x-1.5">
					<span className="text-lg font-semibold tabular-nums text-foreground">
						{formatWorkedTime(figures.groupSeconds)}
					</span>
					{hasEstimate && (
						<span className="text-[13px] text-muted-foreground">
							{t('taskDetail.time.OF_ESTIMATE', { estimate: formatWorkedTime(estimate) })}
						</span>
					)}
					{!hasEstimate && (
						<span className="text-[13px] text-muted-foreground">{t('taskDetail.time.NO_ESTIMATE')}</span>
					)}
				</div>
				{hasEstimate && (
					<>
						<LimitMeter used={figures.groupSeconds} limit={estimate} />
						<EstimateVerdict estimate={estimate} worked={figures.groupSeconds} />
					</>
				)}
				{hasOwnTime && (
					<span className="text-xs tabular-nums text-muted-foreground">
						{t('taskDetail.time.YOURS', {
							total: formatWorkedTime(figures.ownSeconds),
							today: formatWorkedTime(figures.ownTodaySeconds)
						})}
					</span>
				)}
			</div>
			{hasMembers && <MemberTimes members={figures.members} total={figures.groupSeconds} />}
			<div className="hairline-t border-dashed border-border pt-2">
				<EstimateEditor task={task} />
			</div>
		</div>
	);
}
