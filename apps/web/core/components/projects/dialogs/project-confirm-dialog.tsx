'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { commandKeycapClass } from '@/core/components/common/command';
import { DialogDescription, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/common/button';
import { Button as IconButton } from '@/core/components/duplicated-components/_button';
import { ChevronDown, X } from '@/core/components/icons';
import { ProjectDatesCell, ProjectStatusChip, ProjectTile, PeopleCell } from '@/core/components/projects/project-cells';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { cn } from '@/core/lib/helpers';
import { personFromProjectMember } from '@/core/lib/utils/project-list';
import type { TOrganizationProject } from '@/core/types/schemas';
import { PROJECT_DIALOG_FOOTER, ProjectDialog } from './project-dialog';

export type ProjectConfirmTone = 'neutral' | 'danger';

export interface ProjectConsequence {
	key: string;
	icon: ReactNode;
	text: ReactNode;
	tone?: ProjectConfirmTone;
}

const COLLAPSED_PROJECT_COUNT = 4;

const ICON_TILE_TONE: Record<ProjectConfirmTone, string> = {
	neutral: 'keycap-3d text-foreground/70',
	danger: 'bg-destructive/10 text-destructive-ink hairline-ring ring-destructive/20'
};

const CONSEQUENCE_TONE: Record<ProjectConfirmTone, string> = {
	neutral: 'text-foreground [&_svg]:text-muted-foreground',
	danger: 'text-destructive-ink [&_svg]:text-destructive-ink'
};

export function ProjectSummaryCard({ project }: Readonly<{ project: TOrganizationProject }>) {
	const people = (project.members ?? []).map(personFromProjectMember);
	const hasPeople = people.length > 0;
	return (
		<div className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 hairline-ring ring-border shadow-sm shadow-black/6.5">
			<ProjectTile project={project} size="lg" />
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="flex min-w-0 items-baseline gap-2">
					<span className="truncate text-[13px] font-medium text-foreground">{project.name}</span>
					{project.code && (
						<span className="shrink-0 font-mono text-[11px] text-muted-foreground">{project.code}</span>
					)}
				</span>
				<ProjectDatesCell
					startDate={project.startDate}
					endDate={project.endDate}
					className="text-xs text-muted-foreground"
				/>
			</span>
			{hasPeople && <PeopleCell people={people} max={3} />}
		</div>
	);
}

export function ProjectListCard({ projects, label }: Readonly<{ projects: TOrganizationProject[]; label: string }>) {
	const t = useTranslations();
	const { taskStatuses } = useTaskStatusesQuery();
	const [isExpanded, setIsExpanded] = useState(false);
	const hiddenCount = projects.length - COLLAPSED_PROJECT_COUNT;
	const canExpand = hiddenCount > 0;
	const showsAll = isExpanded || !canExpand;
	let shownProjects = projects.slice(0, COLLAPSED_PROJECT_COUNT);
	if (showsAll) {
		shownProjects = projects;
	}
	return (
		<div className="flex flex-col overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
			<div className="flex h-10 items-center justify-between gap-2 hairline-b border-border px-3">
				<span className="text-xs font-medium text-muted-foreground">{label}</span>
				<kbd className={cn(commandKeycapClass, 'tabular-nums')}>{projects.length}</kbd>
			</div>
			<AnimatedHeight swapKey={String(showsAll)}>
				<ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain p-1">
					{shownProjects.map((project) => (
						<li key={project.id} className="flex h-10 items-center gap-2.5 rounded-md px-2">
							<ProjectTile project={project} size="md" />
							<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{project.name}</span>
							<ProjectStatusChip statusName={project.status} statuses={taskStatuses} className="h-5" />
						</li>
					))}
				</ul>
			</AnimatedHeight>
			{canExpand && (
				<button
					type="button"
					onClick={() => setIsExpanded((expanded) => !expanded)}
					aria-expanded={isExpanded}
					className="flex h-9 items-center gap-2 hairline-t border-border px-3 text-left text-xs text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.03] hover:text-foreground focus-visible:bg-foreground/[0.03]"
				>
					<ChevronDown
						aria-hidden="true"
						className={cn('size-3.5 transition-transform duration-200', isExpanded && 'rotate-180')}
					/>
					{isExpanded && t('pages.projects.modals.showLess')}
					{!isExpanded && t('pages.projects.modals.showMore', { count: hiddenCount })}
				</button>
			)}
		</div>
	);
}

function ConsequenceList({ consequences }: Readonly<{ consequences: ProjectConsequence[] }>) {
	return (
		<ul className="flex flex-col gap-2.5 rounded-xl bg-foreground/[0.03] px-3.5 py-3">
			{consequences.map((consequence) => (
				<li
					key={consequence.key}
					className={cn(
						'flex items-start gap-2.5 text-[13px] leading-5 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
						CONSEQUENCE_TONE[consequence.tone ?? 'neutral']
					)}
				>
					{consequence.icon}
					<span className="min-w-0">{consequence.text}</span>
				</li>
			))}
		</ul>
	);
}

export interface ProjectConfirmSecondaryAction {
	label: string;
	isPending: boolean;
	onClick: () => void;
}

interface ProjectConfirmDialogProps {
	open: boolean;
	onClose: () => void;
	icon: ReactNode;
	title: string;
	description?: ReactNode;
	tone?: ProjectConfirmTone;
	subject?: ReactNode;
	consequences: ProjectConsequence[];
	extra?: ReactNode;
	confirmLabel: string;
	isPending: boolean;
	error?: string | null;
	onConfirm: () => void;
	/** A second way to confirm, as an outline button before the main one. */
	secondaryAction?: ProjectConfirmSecondaryAction;
}

export function ProjectConfirmDialog({
	open,
	onClose,
	icon,
	title,
	description,
	tone = 'neutral',
	subject,
	consequences,
	extra,
	confirmLabel,
	isPending,
	error,
	onConfirm,
	secondaryAction
}: Readonly<ProjectConfirmDialogProps>) {
	const t = useTranslations();
	const hasConsequences = consequences.length > 0;
	const isSecondaryPending = secondaryAction?.isPending ?? false;
	const isBusy = isPending || isSecondaryPending;
	let confirmVariant: 'primary' | 'danger' = 'primary';
	if (tone === 'danger') {
		confirmVariant = 'danger';
	}
	return (
		<ProjectDialog open={open} onClose={onClose} width="sm">
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-5 pb-5">
				<div className="flex items-start justify-between gap-3">
					<span
						aria-hidden="true"
						className={cn(
							'flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.5',
							ICON_TILE_TONE[tone]
						)}
					>
						{icon}
					</span>
					<IconButton
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onClose}
						aria-label={t('common.CLOSE')}
						className="-mt-1 -mr-2 text-muted-foreground"
					>
						<X />
					</IconButton>
				</div>
				<DialogTitle className="mt-3 text-[15px] font-semibold text-balance text-foreground">
					{title}
				</DialogTitle>
				{description && (
					<DialogDescription className="mt-1 text-[13px] text-muted-foreground">
						{description}
					</DialogDescription>
				)}
				<div className="mt-4 flex flex-col gap-3">
					{subject}
					{hasConsequences && <ConsequenceList consequences={consequences} />}
					{extra}
				</div>
			</div>
			<div className={PROJECT_DIALOG_FOOTER}>
				{error && (
					<p role="alert" className="mr-auto text-xs text-destructive-ink">
						{error}
					</p>
				)}
				<Button
					type="button"
					variant="ghost"
					size="default"
					onClick={onClose}
					disabled={isBusy}
					data-initial-focus=""
					className={cn(!error && 'ml-auto')}
				>
					{t('common.CANCEL')}
				</Button>
				{secondaryAction && (
					<Button
						type="button"
						variant="outline"
						size="default"
						onClick={secondaryAction.onClick}
						loading={isSecondaryPending}
						disabled={isBusy}
					>
						{secondaryAction.label}
					</Button>
				)}
				<Button
					type="button"
					variant={confirmVariant}
					size="default"
					onClick={onConfirm}
					loading={isPending}
					disabled={isBusy}
				>
					{confirmLabel}
				</Button>
			</div>
		</ProjectDialog>
	);
}
