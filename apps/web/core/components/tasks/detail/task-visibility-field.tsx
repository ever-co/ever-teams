'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Globe, Lock } from '@/core/components/icons';
import { TaskPropertyMenu, type TaskPropertyMenuOption } from '@/core/components/tasks/task-property-menu';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_EMPTY_VALUE } from './task-detail-recipes';

type Visibility = 'public' | 'private';

function visibilityOf(isPublic: boolean | null | undefined): Visibility {
	if (isPublic) {
		return 'public';
	}
	return 'private';
}

function VisibilityGlyph({ visibility }: Readonly<{ visibility: Visibility }>): ReactNode {
	if (visibility === 'public') {
		return <Globe aria-hidden="true" className="size-4 text-muted-foreground" />;
	}
	return <Lock aria-hidden="true" className="size-4 text-muted-foreground" />;
}

export function TaskVisibilityField({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { updatePublicity } = useUpdateTask();
	const { getTaskById } = useTaskQueries();
	const [pending, setPending] = useState<Visibility | null>(null);
	const visibility = pending ?? visibilityOf(task.public);

	const labels = useMemo(
		() => ({ public: t('taskDetail.properties.PUBLIC'), private: t('taskDetail.properties.PRIVATE') }),
		[t]
	);

	const options = useMemo<TaskPropertyMenuOption<Visibility>[]>(
		() => [
			{ key: 'public', value: 'public', label: labels.public, icon: <VisibilityGlyph visibility="public" /> },
			{ key: 'private', value: 'private', label: labels.private, icon: <VisibilityGlyph visibility="private" /> }
		],
		[labels]
	);

	const choose = useCallback(
		async (next: Visibility) => {
			if (next === visibility) {
				return;
			}
			setPending(next);
			try {
				await updatePublicity({ publicity: next === 'public', task, loader: true, isDetailedTask: true });
			} catch {
				toast.error(t('toasts.tasks.PROPERTY_UPDATE_FAILED', { field: t('taskDetail.properties.VISIBILITY') }));
				getTaskById(task.id);
			} finally {
				setPending(null);
			}
		},
		[getTaskById, t, task, updatePublicity, visibility]
	);

	return (
		<TaskPropertyMenu
			options={options}
			isSelected={(value) => value === visibility}
			onSelect={(value) => void choose(value)}
			searchPlaceholder={t('taskDetail.properties.VISIBILITY')}
			triggerLabel={t('taskDetail.properties.VISIBILITY')}
			triggerClassName="rounded-md"
			popupClassName="w-52"
		>
			<span className={DETAIL_EMPTY_VALUE}>
				<VisibilityGlyph visibility={visibility} />
				<span className="text-foreground">{labels[visibility]}</span>
			</span>
		</TaskPropertyMenu>
	);
}
