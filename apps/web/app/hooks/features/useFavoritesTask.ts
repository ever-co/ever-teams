import { useTeamTasks } from '@/app/hooks/features/useTeamTasks';
import { ITeamTask } from '@/app/interfaces/ITask';
import { useState } from 'react';
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
	const [favoriteTasks, setFavoriteTasks] = useState<ITeamTask[]>([]);
	const toggleFavorite = (task: ITeamTask) => {
		if (favoriteTasks.includes(task)) {
			setFavoriteTasks((prev) => prev.filter((t) => t.id !== task.id));
		} else {
			setFavoriteTasks((prev) => [...prev, task]);
		}
	};
	const isFavorite = (task: ITeamTask) => favoriteTasks.includes(task);

	const addFavorite = (task: ITeamTask) => {
		toggleFavorite(task);
	};

	return {
		favoriteTasks,
		toggleFavorite,
		isFavorite,
		addFavorite
	};
};
