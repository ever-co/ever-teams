'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { useBuiltInViewTasks } from '@/core/hooks/task-views/use-built-in-view-tasks';
import { useTaskViewQuery } from '@/core/hooks/task-views/use-task-views-query';
import { isBuiltInViewKey } from '@/core/lib/utils/task-views';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import type { ETaskBuiltInView } from '@/core/types/interfaces/common/task-views';
import { TeamTasksPage } from '../list/team-tasks-page';
import { TeamTasksPageSkeleton } from '../team-tasks-page-skeleton';

function ViewNotice({ title, text }: Readonly<{ title: string; text: string }>) {
	const t = useTranslations();
	return (
		<PageLayout title={t('taskViews.TITLE')} className="min-h-0 flex-1">
			<div className="flex h-full items-center justify-center p-4">
				<AnimatedEmptyState title={title} message={text} />
			</div>
		</PageLayout>
	);
}

function SavedViewPage({ viewId }: Readonly<{ viewId: string }>) {
	const t = useTranslations();
	const query = useTaskViewQuery(viewId);
	if (query.isLoading) return <TeamTasksPageSkeleton />;
	if (query.isError || !query.data) return <ViewNotice title={t('taskViews.NOT_FOUND_TITLE')} text={t('taskViews.NOT_FOUND_TEXT')} />;
	return <TeamTasksPage viewContext={{ kind: 'saved', view: query.data }} />;
}

function BuiltInViewPage({ viewKey }: Readonly<{ viewKey: ETaskBuiltInView }>) {
	const { tasks, isLoading, isError, refetch } = useBuiltInViewTasks(viewKey);
	return <TeamTasksPage viewContext={{ kind: 'builtIn', key: viewKey, tasks, isLoading, isError, refetch: () => void refetch() }} />;
}

/** `/views/[viewId]`: a saved view by id, or a built-in one by its key (`mine`, `this-week`, `overdue`, `due-soon`). */
export function TaskViewRoute() {
	const t = useTranslations();
	const params = useParams<{ viewId: string }>();
	const viewId = params?.viewId ?? '';
	if (!isTaskViewsEnabled()) {
		return <ViewNotice title={t('taskViews.UNAVAILABLE_TITLE')} text={t('taskViews.UNAVAILABLE_TEXT')} />;
	}
	if (isBuiltInViewKey(viewId)) {
		return <BuiltInViewPage key={viewId} viewKey={viewId} />;
	}
	return <SavedViewPage key={viewId} viewId={viewId} />;
}
