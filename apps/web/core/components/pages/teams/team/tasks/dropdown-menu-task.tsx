import { Button } from '@/core/components/duplicated-components/_button';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator
} from '@/core/components/common/dropdown-menu';
import { useAuthenticateUser, useTeamMemberMutations, useTMCardTaskEdit } from '@/core/hooks';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { FC, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { Copy, FileText, MoreHorizontal, Spinner, Star, UserAdd, UserRemove } from '@/core/components/icons';
import { useFavoriteTasks } from '@/core/hooks/tasks/use-favorites-task';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';

function favoriteLabelKey(isFavorite: boolean) {
	if (isFavorite) {
		return 'common.REMOVE_FAVORITE_TASK' as const;
	}
	return 'common.ADD_FAVORITE_TASK' as const;
}

function favoriteIcon(isLoading: boolean) {
	if (isLoading) {
		return <Spinner className="animate-spin" />;
	}
	return <Star />;
}

function assignmentLabelKey(isAssigned: boolean | undefined) {
	if (isAssigned) {
		return 'common.UNASSIGN_TASK' as const;
	}
	return 'common.ASSIGN_TASK' as const;
}

function assignmentIcon(isAssigned: boolean | undefined) {
	if (isAssigned) {
		return <UserRemove />;
	}
	return <UserAdd />;
}

const DropdownMenuTask: FC<{ task: TTask }> = ({ task }) => {
	const activeTeam = useAtomValue(activeTeamState);
	const router = useRouter();
	const { user } = useAuthenticateUser();
	const isAssigned = task?.members?.some((m) => m?.user?.id === user?.id);
	const member = activeTeam?.members?.find((m) => m?.employee?.user?.id === user?.id);
	const { assignTask, unassignTask } = useTeamMemberMutations(member);
	const taskEdition = useTMCardTaskEdit(task);
	const { toggleFavoriteTask, isFavoriteTask, addTaskToFavoriteLoading, deleteTaskFromFavoritesLoading } =
		useFavoriteTasks();
	const t = useTranslations();
	const isFavoriteLoading = addTaskToFavoriteLoading || deleteTaskFromFavoritesLoading;
	const isFavorite = isFavoriteTask(task.id);

	const handleAssignment = useCallback(async () => {
		try {
			if (isAssigned) {
				await unassignTask(task);
			} else {
				await assignTask(task);
			}
		} catch (error) {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.ASSIGNEES_NOT_SAVED'), { description: t(reasonKey) });
		}
	}, [isAssigned, assignTask, unassignTask, task, t]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="text-muted-foreground">
					<span className="sr-only">{t('common.MORE_OPTIONS')}</span>
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					className="cursor-pointer"
					onClick={() => taskEdition?.task?.id && navigator.clipboard.writeText(taskEdition.task.id)}
				>
					<Copy />
					{t('common.COPY_TASK_ID')}
				</DropdownMenuItem>
				<DropdownMenuSeparator />

				<DropdownMenuItem className="relative cursor-pointer" onClick={() => router.push(`/task/${task.id}`)}>
					<FileText />
					{t('common.TASK_DETAILS')}
				</DropdownMenuItem>

				<DropdownMenuItem className="cursor-pointer" onClick={async () => await toggleFavoriteTask(task)}>
					{favoriteIcon(isFavoriteLoading)}
					{t(favoriteLabelKey(isFavorite))}
				</DropdownMenuItem>

				<DropdownMenuItem className="cursor-pointer" onClick={handleAssignment}>
					{assignmentIcon(isAssigned)}
					{t(assignmentLabelKey(isAssigned))}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default DropdownMenuTask;
