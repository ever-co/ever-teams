'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Button } from '@/core/components/duplicated-components/_button';
import { RotateLeft, Search, ShieldCheck, Trash } from '@/core/components/icons';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { useTaskTrash, type TaskTrashFilter } from '@/core/hooks/tasks/use-task-trash';
import { TASK_TRASH_SEARCH_MAX_LENGTH } from '@/core/services/client/api/tasks/task-trash.service';
import { trashedTaskNumberOf, trashedTaskPersonName } from '@/core/lib/utils/task-trash';
import type { ITrashedTask } from '@/core/types/interfaces/task/task-trash';

interface TaskTrashListProps {
	/** The active team: a team's trash, and the team a manager reads a project's trash through. */
	teamId: string | null;
	/** A project's trash, or `null` for the team's. */
	projectId: string | null;
	/** Whether the project column shows (a team's trash spans projects). */
	showsProject?: boolean;
}

/**
 * The deleted tasks of a team or a project (`NEXT_PUBLIC_TASK_TRASH_ENABLED`), most recently deleted first: each can
 * be restored or deleted for good (after a confirmation). A search box finds a task by title or number, and Load more
 * reads the next page. When the platform keeps the trash off, or the reader may not see it, the list says so.
 */
export function TaskTrashList({ teamId, projectId, showsProject = true }: Readonly<TaskTrashListProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const [search, setSearch] = useState('');
	const filter = useMemo<TaskTrashFilter>(() => ({ teamId, projectId, search }), [projectId, search, teamId]);
	const trash = useTaskTrash(filter);
	const { openTaskDrawer } = useTaskDrawer();
	const [deleting, setDeleting] = useState<ITrashedTask | null>(null);
	// Every task with a restore or a delete still running: one finishing leaves the others' buttons disabled.
	const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
	const setBusy = (taskId: string, isBusy: boolean) =>
		setBusyIds((current) => {
			const next = new Set(current);
			if (isBusy) next.add(taskId);
			else next.delete(taskId);
			return next;
		});
	const dateFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
		[locale]
	);

	const restore = async (task: ITrashedTask) => {
		setBusy(task.id, true);
		const isRestored = await trash.restore(task);
		setBusy(task.id, false);
		if (!isRestored) {
			toast.error(t('taskTrash.RESTORE_FAILED'));
			return;
		}
		toast(t('taskTrash.RESTORED', { title: task.title }), {
			action: { label: t('taskTrash.OPEN'), onClick: () => openTaskDrawer(task.id) }
		});
	};

	const deleteForever = async (task: ITrashedTask) => {
		setBusy(task.id, true);
		const isDeleted = await trash.deleteForever(task);
		setBusy(task.id, false);
		// Closes this task's confirmation only, not one opened for another task meanwhile.
		setDeleting((current) => (current?.id === task.id ? null : current));
		if (!isDeleted) {
			toast.error(t('taskTrash.DELETE_FAILED'));
			return;
		}
		toast(t('taskTrash.DELETED_FOREVER', { title: task.title }));
	};

	if (trash.status === 'unavailable') {
		return (
			<AnimatedEmptyState
				title={t('taskTrash.UNAVAILABLE_TITLE')}
				message={t('taskTrash.UNAVAILABLE_TEXT')}
				icon={<Trash />}
				minHeight="320px"
			/>
		);
	}
	if (trash.status === 'forbidden') {
		return (
			<AnimatedEmptyState
				title={t('taskTrash.FORBIDDEN_TITLE')}
				message={t('taskTrash.FORBIDDEN_TEXT')}
				icon={<ShieldCheck />}
				minHeight="320px"
			/>
		);
	}

	const hasTasks = trash.tasks.length > 0;
	const isSearching = search.trim().length > 0;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">{t('taskTrash.HINT')}</p>
				<label className="relative flex w-full items-center sm:w-64">
					<Search
						className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
						aria-hidden="true"
					/>
					<input
						type="search"
						value={search}
						maxLength={TASK_TRASH_SEARCH_MAX_LENGTH}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={t('taskTrash.SEARCH')}
						aria-label={t('taskTrash.SEARCH')}
						className="h-8 w-full rounded-lg bg-card pl-8 pr-2 text-[13px] outline-none hairline-ring ring-border placeholder:text-muted-foreground/75 focus-visible:ring-foreground/25"
					/>
				</label>
			</div>

			{trash.status === 'loading' && <TrashSkeleton />}
			{trash.status === 'error' && (
				<AnimatedEmptyState
					title={t('taskTrash.LOAD_FAILED')}
					message={null}
					actionLabel={t('pages.unauthorized.TRY_AGAIN')}
					actionVariant="outline"
					onAction={trash.retry}
					minHeight="200px"
				/>
			)}
			{trash.status === 'ready' && !hasTasks && (
				<AnimatedEmptyState
					title={isSearching ? t('taskTrash.NO_MATCH_TITLE') : t('taskTrash.EMPTY_TITLE')}
					message={isSearching ? t('taskTrash.NO_MATCH_TEXT') : t('taskTrash.EMPTY_TEXT')}
					icon={<Trash />}
					showBorder={false}
					minHeight="240px"
				/>
			)}
			{hasTasks && (
				<ul className="flex flex-col divide-y divide-border rounded-xl hairline-border border-border bg-card">
					{trash.tasks.map((task) => {
						const deletedBy = trashedTaskPersonName(task.deletedByUser);
						const deletedAt = dateFormat.format(new Date(task.deletedAt));
						const isBusy = busyIds.has(task.id);
						return (
							<li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
								<span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
									{trashedTaskNumberOf(task)}
								</span>
								<div className="min-w-0 flex-1 basis-48">
									<p className="truncate text-[13px] font-medium text-foreground">{task.title}</p>
									<p className="truncate text-xs text-muted-foreground">
										{deletedBy
											? t('taskTrash.DELETED_BY', { name: deletedBy, date: deletedAt })
											: t('taskTrash.DELETED_AT', { date: deletedAt })}
										{showsProject && task.project?.name ? ` · ${task.project.name}` : ''}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-1.5">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isBusy}
										onClick={() => void restore(task)}
									>
										<RotateLeft className="size-3.5" aria-hidden="true" />
										{t('taskTrash.RESTORE')}
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="text-destructive"
										disabled={isBusy}
										onClick={() => setDeleting(task)}
									>
										{t('taskTrash.DELETE_FOREVER')}
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
			{trash.hasMore && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="self-center"
					disabled={trash.isLoadingMore}
					onClick={trash.loadMore}
				>
					{t('taskTrash.LOAD_MORE', { shown: trash.tasks.length, total: trash.total })}
				</Button>
			)}

			<AlertDialogConfirmation
				isOpen={deleting !== null}
				onOpenChange={(open) => {
					if (!open) setDeleting(null);
				}}
				title={t('taskTrash.DELETE_FOREVER_TITLE')}
				description={t('taskTrash.DELETE_FOREVER_TEXT', { title: deleting?.title ?? '' })}
				confirmText={t('taskTrash.DELETE_FOREVER')}
				cancelText={t('common.CANCEL')}
				loading={deleting !== null && busyIds.has(deleting.id)}
				onConfirm={() => {
					if (deleting) void deleteForever(deleting);
				}}
				onCancel={() => setDeleting(null)}
			/>
		</div>
	);
}

const SKELETON_ROWS = ['trash-1', 'trash-2', 'trash-3'];

function TrashSkeleton() {
	return (
		<output className="flex flex-col divide-y divide-border rounded-xl hairline-border border-border">
			{SKELETON_ROWS.map((key) => (
				<span key={key} className="flex items-center gap-3 px-3 py-3">
					<span className="h-3 w-10 animate-pulse rounded-full bg-foreground/[0.06]" />
					<span className="flex flex-1 flex-col gap-1.5">
						<span className="h-3 w-2/3 animate-pulse rounded-full bg-foreground/[0.06]" />
						<span className="h-3 w-1/3 animate-pulse rounded-full bg-foreground/[0.06]" />
					</span>
				</span>
			))}
		</output>
	);
}
