import { ITeamTask } from '@/core/types/interfaces/to-review/ITask';
import { useAtom } from 'jotai';
import { favoriteTasksStorageAtom } from '@/core/stores/teams/team-tasks';
import { useCallback } from 'react';
import { useTeamTasks } from '../organizations';
/**
 * A React hook that manages a list of favorite tasks for a team.
 *
 * The `useFavoritesTask` hook returns an object with the following properties:
 *
 * - `tasks`: The list of all tasks for the team, obtained from the `useTeamTasks` hook.
 * - `favoriteTasks`: The list of favorite tasks.
 * - `toggleFavorite`: A function that toggles the favorite status of a given task.
 * - `isFavorite`: A function that checks if a given task is a favorite.
 * - `addFavorite`: A function that adds a task to the list of favorites.
 */

export const useFavoritesTask = () => {
	const { tasks } = useTeamTasks();
	const [favoriteTasks, setFavoriteTasks] = useAtom(favoriteTasksStorageAtom);

	const toggleFavorite = useCallback((task: ITeamTask) => {
		if (!task?.id) {
			console.warn('Invalid task provided to toggleFavorite');
			return;
		}
		setFavoriteTasks((prev) =>
			prev.some((t) => t.id === task.id) ? prev.filter((t) => t.id !== task.id) : [...prev, task]
		);
	}, []);

	const isFavorite = useCallback((task: ITeamTask) => favoriteTasks.some((t) => t.id === task.id), [favoriteTasks]);

	const addFavorite = useCallback((task: ITeamTask) => {
		if (!isFavorite(task)) {
			setFavoriteTasks((prev) => [...prev, task]);
		}
	}, []);

	return {
		tasks,
		favoriteTasks,
		toggleFavorite,
		isFavorite,
		addFavorite
	};
};
