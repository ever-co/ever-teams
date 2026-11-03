import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import stc from 'string-to-color';
import { toast } from 'sonner';
import { isValidUrl } from '@/core/lib/utils';
import { cn } from '@/core/lib/helpers';
import { imgTitle } from '@/core/lib/helpers/index';
import { TableActionPopover } from '@/core/components/settings/table-action-popover';
import { getTimerStatusValue, TimerStatus } from '../../timer/timer-status';
import { Avatar } from '../../duplicated-components/avatar';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TProfileActivityResponse } from '@/core/types/schemas/activities/profile-activity.schema';
import { timerStatusState } from '@/core/stores';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useTodayWorkedTime } from '@/core/hooks/activities/use-today-worked-time';
import type { I_UserProfilePage } from '@/core/hooks';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { formatLocalDay, lastActiveKindOf, personFullName } from '@/core/lib/utils/profile-figures';
import { statusOfTask, taskNumberLabel } from '@/core/lib/utils/team-tasks-view';
import { TaskDrawerLink } from '@/core/components/tasks/drawer/task-drawer-link';
import { BRAND_WASH_PANEL } from '@/core/components/common/surface-recipes';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { MetricStrip, type MetricItem } from '@/core/components/dashboards/kit/metric-strip';
import { Check, Copy } from '@/core/components/icons';
import { ProfileActions } from './profile-actions';
import type { I_TaskFilter } from './task-filters';

const AVATAR_SIZE = 48;

const NOT_AVAILABLE = '–';

const COPIED_MS = 1500;

const COPY_BUTTON =
	'flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,transform] duration-150 hover:bg-foreground/5 hover:text-foreground active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5';

/** The card of the work in progress, on the plans calendar's material: the task on top, the clock under it. */
const NOW_CARD = cn(
	BRAND_WASH_PANEL,
	'flex w-full min-w-0 max-w-xs flex-col justify-center gap-2.5 px-4 py-3.5 max-xl:order-first max-sm:max-w-none'
);

/**
 * The figures stand on a plain white panel, no line around them, and keep their own width from `sm`: the space
 * beside them is the band's breathing room, never a reason to spread the values apart.
 */
const FIGURES_PANEL = 'flex min-w-0 items-center rounded-2xl bg-card p-1.5 max-sm:w-full sm:w-fit';

/** The figures at the start, the own timer card at the end, each at its own size; they wrap on a narrow page. */
const SUMMARY_WITH_TIMER = 'flex flex-wrap items-start justify-between gap-3';

const SUMMARY_FIGURES_ONLY = 'flex';

type FigureKey = 'today' | 'month' | 'activeDays' | 'lastActive';

type UserProfileDetailProps = {
	member?: TOrganizationTeamEmployee;
	profile?: I_UserProfilePage;
	hook?: I_TaskFilter;
	/** The month summary the page reads for the Stats count; its other figures are shown here. */
	activitySummary?: TProfileActivityResponse;
	isActivitySummaryLoading?: boolean;
	canSeeActivity?: boolean;
	timer?: ReactNode;
};

/**
 * The head of a person's page: who they are and what the viewer can do for them on one line, then one card that
 * says what they do right now and their figures when the viewer may see them.
 */
export function UserProfileDetail({
	member,
	profile,
	hook,
	activitySummary,
	isActivitySummaryLoading = false,
	canSeeActivity = false,
	timer
}: Readonly<UserProfileDetailProps>) {
	let actions: ReactNode = null;
	if (profile && hook) {
		actions = <ProfileActions hook={hook} profile={profile} />;
	}

	return (
		<div className="flex flex-col gap-4 pb-5 pt-4">
			<div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
				<ProfileIdentity member={member} />
				{actions}
			</div>
			<ProfileSummaryCard
				member={member}
				profile={profile}
				activitySummary={activitySummary}
				isLoading={isActivitySummaryLoading}
				canSeeActivity={canSeeActivity}
				timer={timer}
			/>
		</div>
	);
}

function ProfileIdentity({ member }: Readonly<{ member?: TOrganizationTeamEmployee }>) {
	const t = useTranslations();
	const user = member?.employee?.user;
	const fullName = personFullName(user);
	const { isTeamManager } = useIsMemberManager(user);

	return (
		<div className="flex min-w-0 items-center gap-3.5">
			<ProfileAvatar member={member} fullName={fullName} />
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex min-w-0 items-center gap-2">
					<h1
						title={fullName}
						className="min-w-0 truncate text-xl font-semibold leading-7 tracking-[-0.01em] text-foreground"
					>
						{fullName}
					</h1>
					{isTeamManager && (
						<span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-ink">
							{t('common.MANAGER')}
						</span>
					)}
					{member && (
						<div className="size-7 shrink-0">
							<TableActionPopover member={member} status="profile" />
						</div>
					)}
				</div>
				{user?.email && <ProfileEmail email={user.email} />}
			</div>
		</div>
	);
}

function ProfileAvatar({ member, fullName }: Readonly<{ member?: TOrganizationTeamEmployee; fullName: string }>) {
	const user = member?.employee?.user;
	const imageUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const hasImage = Boolean(imageUrl) && isValidUrl(imageUrl);
	const timerStatus = useAtomValue(timerStatusState);
	const timerStatusValue: ETimerStatus = useMemo(
		() => getTimerStatusValue(timerStatus, member, false),
		[timerStatus, member]
	);
	const status = (
		<TimerStatus
			status={timerStatusValue}
			className="ring-2 ring-background"
			tooltipClassName="absolute -bottom-0.5 -right-0.5"
		/>
	);

	return (
		<div
			className={cn(
				'relative flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-medium text-white',
				!hasImage && 'hairline-ring ring-border'
			)}
			style={{ backgroundColor: `${stc(fullName)}80` }}
		>
			{hasImage && (
				<Avatar
					size={AVATAR_SIZE}
					className="relative"
					imageUrl={imageUrl}
					alt={fullName}
					imageTitle={fullName.charAt(0)}
				>
					{status}
				</Avatar>
			)}
			{!hasImage && (
				<>
					{imgTitle(fullName).charAt(0)}
					{status}
				</>
			)}
		</div>
	);
}

/** The email and its copy button; the button itself confirms the copy, so nothing pops over the page. */
function ProfileEmail({ email }: Readonly<{ email: string }>) {
	const t = useTranslations();
	const [isCopied, setIsCopied] = useState(false);

	useEffect(() => {
		if (!isCopied) {
			return;
		}
		const timeout = window.setTimeout(() => setIsCopied(false), COPIED_MS);
		return () => window.clearTimeout(timeout);
	}, [isCopied]);

	const copyEmail = async () => {
		try {
			await navigator.clipboard.writeText(email);
			setIsCopied(true);
		} catch {
			toast.error(t('profile.page.EMAIL_NOT_COPIED'));
		}
	};

	let copyLabel: string = t('profile.page.COPY_EMAIL');
	let copyIcon = <Copy aria-hidden="true" />;
	if (isCopied) {
		copyLabel = t('common.COPIED');
		copyIcon = <Check aria-hidden="true" className="text-success-foreground" />;
	}

	return (
		<div className="flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
			<span className="min-w-0 truncate" title={email}>
				{email}
			</span>
			<button type="button" onClick={copyEmail} aria-label={copyLabel} title={copyLabel} className={COPY_BUTTON}>
				{copyIcon}
			</button>
			<span aria-live="polite" className="sr-only">
				{isCopied && t('common.COPIED')}
			</span>
		</div>
	);
}

function ProfileSummaryCard({
	member,
	profile,
	activitySummary,
	isLoading,
	canSeeActivity,
	timer
}: Readonly<{
	member?: TOrganizationTeamEmployee;
	profile?: I_UserProfilePage;
	activitySummary?: TProfileActivityResponse;
	isLoading: boolean;
	canSeeActivity: boolean;
	timer?: ReactNode;
}>) {
	const timerStatus = useAtomValue(timerStatusState);
	const ownTask = trackedTaskOf(profile, timerStatus?.lastLog?.taskId);
	const hasTimer = Boolean(timer);
	const isEmpty = !canSeeActivity && !hasTimer;
	if (isEmpty) {
		return null;
	}

	let layout = SUMMARY_FIGURES_ONLY;
	if (hasTimer) {
		layout = SUMMARY_WITH_TIMER;
	}

	return (
		<section className={layout}>
			{canSeeActivity && (
				<div className={FIGURES_PANEL}>
					<ProfileFigures member={member} activitySummary={activitySummary} isLoading={isLoading} />
				</div>
			)}
			{hasTimer && <OwnTimerCard task={ownTask} timer={timer} />}
		</section>
	);
}

/**
 * The task being tracked: the profile's active task, or for the signed-in member the running timer's task while the
 * team's active task is not known yet. Nothing when neither names one, rather than a guess.
 */
function trackedTaskOf(profile: I_UserProfilePage | undefined, timerTaskId: string | null | undefined) {
	const activeTask = profile?.activeUserTeamTask;
	if (activeTask) {
		return activeTask as TTask;
	}
	const isOwnProfile = Boolean(profile?.isAuthUser);
	if (!isOwnProfile || !timerTaskId) {
		return null;
	}
	const teamTasks = profile?.tasksGrouped.tasks ?? [];
	return teamTasks.find((task) => task.id === timerTaskId) ?? null;
}

/**
 * The signed-in member's own timer, shown on their profile only: the task's status, number and title on top, and
 * right under it the clock with its button, side by side.
 */
function OwnTimerCard({ task, timer }: Readonly<{ task: TTask | null; timer: ReactNode }>) {
	const t = useTranslations();
	let taskLine: ReactNode = (
		<span className="text-[13px] text-muted-foreground">{t('profile.page.NO_TASK_PICKED')}</span>
	);
	if (task) {
		taskLine = <CurrentTask task={task} />;
	}

	return (
		<div className={NOW_CARD}>
			{taskLine}
			<div className="flex">{timer}</div>
		</div>
	);
}

function readableStatusName(value: string | null | undefined) {
	if (!value) {
		return '';
	}
	return value.split('-').join(' ');
}

/** The task's status as its glyph and name, read only: the status menu stays on the task's row below. */
function CurrentTaskStatus({ task }: Readonly<{ task: TTask }>) {
	const { taskStatuses } = useTaskStatusesQuery();
	const status = statusOfTask(task, taskStatuses);
	const name = status?.name ?? (task.status as string | null | undefined);
	if (!name) {
		return null;
	}
	return (
		<span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium capitalize text-muted-foreground">
			<TaskPropertyIcon kind="status" name={name} color={status?.color} className="size-3.5" />
			{readableStatusName(name)}
		</span>
	);
}

/** One line whatever the title's length; the link opens the task, where the whole title reads. */
function CurrentTask({ task }: Readonly<{ task: TTask }>) {
	const number = taskNumberLabel(task);
	const fullTitle = `${number} ${task.title}`;
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			<CurrentTaskStatus task={task} />
			<TaskDrawerLink
				taskId={task.id}
				title={fullTitle}
				className="block min-w-0 truncate rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<span className="tabular-nums text-muted-foreground">{number}</span> {task.title}
			</TaskDrawerLink>
		</div>
	);
}

function ProfileFigures({
	member,
	activitySummary,
	isLoading
}: Readonly<{ member?: TOrganizationTeamEmployee; activitySummary?: TProfileActivityResponse; isLoading: boolean }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { totalSeconds: todaySeconds } = useTodayWorkedTime({ id: member?.id });
	const lastActive = useLastActiveLabel(activitySummary, locale);

	let monthValue = NOT_AVAILABLE;
	let activeDaysValue = NOT_AVAILABLE;
	if (activitySummary) {
		monthValue = formatDurationShort(activitySummary.totalDuration);
		activeDaysValue = String(activitySummary.activeDays);
	}

	const items: MetricItem<FigureKey>[] = [
		{ key: 'today', label: t('common.TODAY'), value: formatDurationShort(todaySeconds) },
		{ key: 'month', label: t('profile.page.THIS_MONTH'), value: monthValue },
		{ key: 'activeDays', label: t('profile.page.ACTIVE_DAYS'), value: activeDaysValue },
		{ key: 'lastActive', label: t('profile.page.LAST_ACTIVE'), value: lastActive }
	];

	return (
		<MetricStrip
			items={items}
			ariaLabel={t('profile.page.FIGURES')}
			isLoading={isLoading}
			className="grid w-full min-w-0 grid-cols-2 sm:flex sm:[&>*]:min-w-36"
		/>
	);
}

function useLastActiveLabel(activitySummary: TProfileActivityResponse | undefined, locale: string) {
	const t = useTranslations();
	if (!activitySummary) {
		return NOT_AVAILABLE;
	}
	const lastActiveOn = activitySummary.lastActiveOn;
	const kind = lastActiveKindOf(lastActiveOn, activitySummary.period.timeZone);
	if (kind === 'today') {
		return t('common.TODAY');
	}
	if (kind === 'yesterday') {
		return t('common.YESTERDAY');
	}
	if (kind === 'earlier' && lastActiveOn) {
		return formatLocalDay(lastActiveOn, locale);
	}
	return NOT_AVAILABLE;
}
