'use client';

import Link from 'next/link';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Badge } from '@/core/components/common/badge';
import { Task } from '@/core/components/icons';
import { useTaskViewsQuery } from '@/core/hooks/task-views/use-task-views-query';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { ETaskViewVisibility, TASK_BUILT_IN_VIEWS } from '@/core/types/interfaces/common/task-views';

/** The i18n key of a built-in view's name. */
export function builtInViewLabelKey(key: string): DottedLanguageObjectStringPaths {
	const name = key.toUpperCase().split('-').join('_');
	return `taskViews.BUILT_IN_${name}` as DottedLanguageObjectStringPaths;
}

const ROW = 'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-foreground/5';

/** `/views`: the built-in views and the saved views of the team, each a link. */
export function ViewsPage() {
	const t = useTranslations();
	const { views, isLoading } = useTaskViewsQuery();
	const enabled = isTaskViewsEnabled();

	return (
		<PageLayout title={t('taskViews.TITLE')} className="min-h-0 flex-1">
			{!enabled ? (
				<div className="flex h-full items-center justify-center p-4">
					<AnimatedEmptyState title={t('taskViews.UNAVAILABLE_TITLE')} message={t('taskViews.UNAVAILABLE_TEXT')} />
				</div>
			) : (
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
					<section className="flex flex-col gap-1">
						<h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('taskViews.BUILT_IN')}</h2>
						{TASK_BUILT_IN_VIEWS.map((key) => (
							<Link key={key} href={`/views/${key}`} className={ROW}>
								<span className="flex items-center gap-2">
									<Task className="size-4 text-muted-foreground" aria-hidden="true" />
									{t(builtInViewLabelKey(key))}
								</span>
							</Link>
						))}
					</section>
					<section className="flex flex-col gap-1">
						<h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('taskViews.SAVED')}</h2>
						{isLoading && <p className="px-3 text-sm text-muted-foreground">{t('taskViews.LOADING')}</p>}
						{!isLoading && views.length === 0 && (
							<div className="px-3 py-6">
								<AnimatedEmptyState title={t('taskViews.EMPTY_TITLE')} message={t('taskViews.EMPTY_TEXT')} />
							</div>
						)}
						{views.map((view) => (
							<Link key={view.id} href={`/views/${view.id}`} className={ROW}>
								<span className="truncate">{view.name}</span>
								<Badge variant="outline" className="shrink-0 text-xs font-normal">
									{view.visibility === ETaskViewVisibility.PERSONAL ? t('taskViews.PERSONAL') : t('taskViews.SHARED')}
								</Badge>
							</Link>
						))}
					</section>
				</div>
			)}
		</PageLayout>
	);
}
