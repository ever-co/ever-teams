import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { useCallback, useMemo } from 'react';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useFavoritesQuery } from '../favorites/use-favorites-query';
import { useCreateFavorite } from '../favorites/use-create-favorite';
import { useDeleteFavorite } from '../favorites/use-delete-favorite';
import { useFavoriteToggle } from '../favorites/use-favorite-toggle';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';

/**
 * A React hook that manages a list of favorite tasks for a team.
 *
 * The `useFavoritesTask` hook returns an object with the following properties:
 *
 * - `employeeFavoritesTasks`: The active team's tasks the current employee has as favorites.
 * - `toggleFavoriteTask`: A function that toggles the favorite status of a given task.
 * - `isFavoriteTask`: Whether a task is a favorite, whatever its team.
 * - `addTaskToFavorite`: A function that adds a task to the list of favorites.
 */

export const useFavoriteTasks = () => {
	const t = useTranslations();
	const tasks = useAtomValue(tasksByTeamState);

	const { currentEmployeeFavorites } = useFavoritesQuery();
	const { createFavorite } = useCreateFavorite();
	const { deleteFavorite } = useDeleteFavorite();
	// The shared star of the app (#5017): the change shows at once, comes back on a refusal, one request per task
	const { isFavorite, hasPending, toggleFavorite } = useFavoriteToggle(EBaseEntityEnum.Task);

	const toggleFavoriteTask = useCallback(
		async (task: TTask) => {
			if (!task) return;
			try {
				await toggleFavorite(task.id);
			} catch {
				toast.error(t('task.toastMessages.TASK_FAVORITE_FAILED'));
			}
		},
		[t, toggleFavorite]
	);

	const employeeFavoritesTasks = useMemo(() => {
		const taskIds = currentEmployeeFavorites
			.filter((el) => el.entity === EBaseEntityEnum.Task)
			.map((el) => el.entityId);

		return tasks.filter((task) => taskIds.includes(task.id));
	}, [tasks, currentEmployeeFavorites]);

	// From all the favorites: a favorite task of another team showed as not one, and its star then removed it
	const isFavoriteTask = useCallback((taskId: string) => isFavorite(taskId), [isFavorite]);

	return {
		employeeFavoritesTasks,
		addTaskToFavorite: createFavorite,
		deleteTaskFromFavorites: deleteFavorite,
		toggleFavoriteTask,
		addTaskToFavoriteLoading: hasPending,
		deleteTaskFromFavoritesLoading: hasPending,
		isFavoriteTask
	};
};
