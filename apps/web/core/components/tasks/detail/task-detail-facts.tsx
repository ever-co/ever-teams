'use client';

import Link from 'next/link';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { CircleCheck, Clock, User } from '@/core/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { TaskPropertyRow } from './task-property-row';

interface Creator {
	id?: string;
	name?: string;
	firstName?: string;
	lastName?: string;
	imageUrl?: string | null;
}

function creatorNameOf(creator: Creator) {
	const fullName = [creator.firstName, creator.lastName].filter(Boolean).join(' ');
	if (fullName) {
		return fullName;
	}
	return creator.name ?? '';
}

function asDate(value: Date | string | null | undefined) {
	if (!value) {
		return null;
	}
	return new Date(value);
}

function Moment({ value }: Readonly<{ value: Date }>) {
	const format = useFormatter();
	const now = useNow({ updateInterval: 60_000 });
	const relative = format.relativeTime(value, now);
	const full = format.dateTime(value, { dateStyle: 'medium', timeStyle: 'short' });
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<time dateTime={value.toISOString()} className="text-[13px] tabular-nums text-foreground">
						{relative}
					</time>
				}
			/>
			<TooltipContent>{full}</TooltipContent>
		</Tooltip>
	);
}

function TaskCreator({ task }: Readonly<{ task: TTask }>) {
	const creator = (task.createdByUser ?? null) as Creator | null;
	const creatorId = task.createdByUserId ?? creator?.id ?? null;
	if (!creator) {
		return null;
	}
	const name = creatorNameOf(creator);
	const person = { id: creator.id ?? name, name, imageUrl: creator.imageUrl };
	const content = (
		<>
			<PersonAvatar person={person} className="size-5 text-[9px] ring-0" />
			<span className="truncate">{name}</span>
		</>
	);
	if (!creatorId) {
		return <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-foreground">{content}</span>;
	}
	return (
		<Link
			href={`/profile/${creatorId}`}
			className="inline-flex min-w-0 items-center gap-1.5 rounded-md text-[13px] text-foreground outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			{content}
		</Link>
	);
}

export function TaskDetailByline({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const createdAt = asDate(task.createdAt);
	const updatedAt = asDate(task.updatedAt);
	const hasCreator = Boolean(task.createdByUser);
	const showsCreatedSeparator = hasCreator && Boolean(createdAt);
	const showsUpdatedSeparator = Boolean(updatedAt);
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
			{hasCreator && (
				<>
					<span className="shrink-0">{t('taskDrawer.CREATED_BY')}</span>
					<TaskCreator task={task} />
				</>
			)}
			{showsCreatedSeparator && <span aria-hidden="true">·</span>}
			{createdAt && <Moment value={createdAt} />}
			{showsUpdatedSeparator && <span aria-hidden="true">·</span>}
			{updatedAt && (
				<span className="inline-flex items-center gap-1.5">
					<span className="shrink-0">{t('pages.taskDetails.UPDATED')}</span>
					<Moment value={updatedAt} />
				</span>
			)}
		</div>
	);
}

export function TaskDetailFacts({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const createdAt = asDate(task.createdAt);
	const updatedAt = asDate(task.updatedAt);
	const resolvedAt = asDate(task.resolvedAt);
	return (
		<div className="flex flex-col">
			<TaskPropertyRow icon={<User />} label={t('pages.taskDetails.CREATOR')}>
				<TaskCreator task={task} />
			</TaskPropertyRow>
			{createdAt && (
				<TaskPropertyRow icon={<Clock />} label={t('pages.taskDetails.CREATED')}>
					<Moment value={createdAt} />
				</TaskPropertyRow>
			)}
			{updatedAt && (
				<TaskPropertyRow icon={<Clock />} label={t('pages.taskDetails.UPDATED')}>
					<Moment value={updatedAt} />
				</TaskPropertyRow>
			)}
			{resolvedAt && (
				<TaskPropertyRow icon={<CircleCheck />} label={t('pages.taskDetails.RESOLVED')}>
					<Moment value={resolvedAt} />
				</TaskPropertyRow>
			)}
		</div>
	);
}
