'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	Calendar,
	CircleAlert,
	Clock,
	Globe,
	Layers,
	Lock,
	MoreHorizontal,
	Plus,
	UserCheck
} from '@/core/components/icons';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { relativeTimeTextOf } from '@/core/lib/utils/dashboards/manual-time-edits';
import { definitionOf } from '@/core/lib/utils/task-views';
import { builtInViewLabelKey, builtInViewTextKeysOf } from '@/core/lib/utils/task-views-index';
import { shownTeamTasksLayout } from '@/core/lib/utils/team-tasks-layouts';
import { ETaskBuiltInView, ETaskViewVisibility, type ITaskView } from '@/core/types/interfaces/common/task-views';
import { TEAM_TASKS_LAYOUT_OPTIONS } from '../list/team-tasks-layout-options';

const SECTION_TITLE = 'px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground';

const BUILT_IN_ICONS: Record<ETaskBuiltInView, { icon: ReactNode; tint: string }> = {
	[ETaskBuiltInView.MINE]: { icon: <UserCheck />, tint: 'bg-primary/10 text-primary-ink' },
	[ETaskBuiltInView.THIS_WEEK]: { icon: <Calendar />, tint: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
	[ETaskBuiltInView.OVERDUE]: { icon: <CircleAlert />, tint: 'bg-destructive/10 text-destructive-ink' },
	[ETaskBuiltInView.DUE_SOON]: { icon: <Clock />, tint: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' }
};

export function ViewsSectionTitle({ children, meta }: Readonly<{ children: ReactNode; meta?: ReactNode }>) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<h2 className={SECTION_TITLE}>{children}</h2>
			{meta && <span className="text-xs text-muted-foreground">{meta}</span>}
		</div>
	);
}

/** A built-in view: its own icon, its name and the rule it lists by. */
export function BuiltInViewCard({ viewKey }: Readonly<{ viewKey: ETaskBuiltInView }>) {
	const t = useTranslations();
	const { icon, tint } = BUILT_IN_ICONS[viewKey];
	return (
		<Link
			href={`/views/${viewKey}`}
			data-testid={`built-in-view-${viewKey}`}
			className="group flex min-w-0 items-start gap-3 rounded-xl bg-card p-3.5 hairline-ring ring-border outline-none transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			<span
				className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5', tint)}
				aria-hidden="true"
			>
				{icon}
			</span>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium text-foreground">{t(builtInViewLabelKey(viewKey))}</span>
				<span className="text-xs text-muted-foreground">{t(builtInViewTextKeysOf(viewKey).rule)}</span>
			</span>
		</Link>
	);
}

interface SavedViewRowProps {
	view: ITaskView;
	isBusy: boolean;
	onRename: (view: ITaskView) => void;
	onToggleVisibility: (view: ITaskView) => void;
	onDelete: (view: ITaskView) => void;
}

/** A saved view: its name and description, who sees it, when it last changed, and what can be done with it. */
export function SavedViewRow({ view, isBusy, onRename, onToggleVisibility, onDelete }: Readonly<SavedViewRowProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const isPersonal = view.visibility === ETaskViewVisibility.PERSONAL;
	const updatedAt = view.updatedAt ?? view.createdAt;
	const VisibilityIcon = isPersonal ? Lock : Globe;
	const layout = shownTeamTasksLayout(definitionOf(view).settings);
	const layoutOption = TEAM_TASKS_LAYOUT_OPTIONS[layout];
	const LayoutIcon = layoutOption.Icon;

	return (
		<li data-testid="saved-view" className="group flex items-center gap-2 pr-2 transition-colors hover:bg-muted/40">
			<Link
				href={`/views/${view.id}`}
				className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-2.5 pl-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<span
					className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
					aria-hidden="true"
				>
					<LayoutIcon className="size-4" />
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-medium text-foreground">{view.name}</span>
					{view.description && (
						<span className="truncate text-xs text-muted-foreground">{view.description}</span>
					)}
				</span>
				<span
					data-testid="saved-view-layout"
					className="w-20 shrink-0 truncate text-xs text-muted-foreground max-sm:sr-only"
				>
					{t(layoutOption.labelKey)}
				</span>
				{/* Who sees the view; on a phone its icon alone, the word kept for screen readers. */}
				<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
					<VisibilityIcon className="size-3.5" aria-hidden="true" />
					<span className="max-sm:sr-only">
						{isPersonal ? t('taskViews.PERSONAL') : t('taskViews.SHARED')}
					</span>
				</span>
				{updatedAt && (
					<span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground tabular-nums md:block">
						{t('taskViews.UPDATED', { when: relativeTimeTextOf(new Date(updatedAt), locale) })}
					</span>
				)}
			</Link>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={t('taskViews.ACTIONS_OF', { name: view.name })}
						disabled={isBusy}
						className="shrink-0 text-muted-foreground"
					>
						<MoreHorizontal />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => onRename(view)}>{t('taskViews.RENAME')}</DropdownMenuItem>
					<DropdownMenuItem onClick={() => onToggleVisibility(view)}>
						{isPersonal ? t('taskViews.MAKE_SHARED') : t('taskViews.MAKE_PERSONAL')}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => onDelete(view)} className="text-destructive">
						{t('taskViews.DELETE')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</li>
	);
}

export function SavedViewsSkeleton() {
	return (
		<ul className="divide-y divide-border" aria-hidden="true">
			{[0, 1, 2].map((row) => (
				<li key={row} className="flex items-center gap-3 px-3 py-3">
					<span className="size-8 shrink-0 animate-pulse rounded-lg bg-foreground/[0.06]" />
					<span className={cn(SKELETON_BAR, 'h-3 w-48')} />
					<span className={cn(SKELETON_BAR, 'ml-auto h-3 w-20')} />
				</li>
			))}
		</ul>
	);
}

export function SavedViewsEmpty({ onCreate }: Readonly<{ onCreate: () => void }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
			<AnimatedEmptyState
				title={t('taskViews.EMPTY_TITLE')}
				message={t('taskViews.EMPTY_TEXT')}
				icon={<Layers />}
			/>
			<Button type="button" size="sm" onClick={onCreate}>
				<Plus className="size-4" aria-hidden="true" />
				{t('taskViews.NEW_VIEW')}
			</Button>
		</div>
	);
}

export function SavedViewsNoMatch({ onClear }: Readonly<{ onClear: () => void }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
			<p className="text-sm font-medium text-foreground">{t('taskViews.NO_MATCH_TITLE')}</p>
			<p className="text-xs text-muted-foreground">{t('taskViews.NO_MATCH_TEXT')}</p>
			<Button type="button" variant="outline" size="sm" onClick={onClear}>
				{t('taskViews.CLEAR_SEARCH')}
			</Button>
		</div>
	);
}
