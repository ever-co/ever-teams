import { useAtomValue } from 'jotai';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { useCallback, useMemo } from 'react';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useFavorites } from '../favorites';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { useUserQuery } from '../queries/user-user.query';

/**
 * A React hook that manages a list of favorite tasks for a team.
 *
 * The `useFavoritesTask` hook returns an object with the following properties:
 *
 * - `employeeFavoritesTasks`: The list of favorite tasks of the current employee.
 * - `toggleFavoriteTask`: A function that toggles the favorite status of a given task.
 * - `isFavoriteTask`: A function that checks if a given task is a favorite.
 * - `addTaskToFavorite`: A function that adds a task to the list of favorites.
 */

export const useFavoriteTasks = () => {
	const tasks = useAtomValue(tasksByTeamState);
	const { data: user } = useUserQuery();

	const { currentEmployeeFavorites, createFavorite, deleteFavorite, createFavoriteLoading, deleteFavoriteLoading } =
		useFavorites();

	const toggleFavoriteTask = useCallback(
		async (task: TTask) => {
			if (!task) return;

			const isFavoriteTask = currentEmployeeFavorites.some((el) => {
				return el.entity === EBaseEntityEnum.Task && el.entityId === task.id;
			});

			if (isFavoriteTask) {
				await deleteFavorite(task.id);
			} else {
				await createFavorite({
					entity: EBaseEntityEnum.Task,
					entityId: task.id,
					...(user?.employee?.id || user?.employeeId
						? { employeeId: user?.employee?.id || user?.employeeId }
						: {})
				} as IFavoriteCreateRequest);
			}
		},
		[currentEmployeeFavorites, createFavorite, deleteFavorite, user]
	);

	const employeeFavoritesTasks = useMemo(() => {
		const taskIds = currentEmployeeFavorites
			.filter((el) => el.entity === EBaseEntityEnum.Task)
			.map((el) => el.entityId);

		return tasks.filter((task) => taskIds.includes(task.id));
	}, [tasks, currentEmployeeFavorites]);

	const isFavoriteTask = useCallback(
		(taskId: string) => employeeFavoritesTasks.some((t) => t.id === taskId),
		[employeeFavoritesTasks]
	);

	return {
		employeeFavoritesTasks,
		addTaskToFavorite: createFavorite,
		deleteTaskFromFavorites: deleteFavorite,
		toggleFavoriteTask,
		addTaskToFavoriteLoading: createFavoriteLoading,
		deleteTaskFromFavoritesLoading: deleteFavoriteLoading,
		isFavoriteTask
	};
};
