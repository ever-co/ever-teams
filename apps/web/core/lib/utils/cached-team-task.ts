import type { TTask } from '@/core/types/schemas/task/task.schema';

interface TaskPage {
	items?: TTask[];
}

/**
 * A task of the team's cached task list, by its id. The list is an infinite query, kept as pages (`{ pages: [{ items
 * }] }`); read as one `{ items }` list it always came out empty, and what depended on the task was skipped without a
 * word (#5714). A list kept as one page is read too.
 *
 * @param cachedList What the query cache holds under the team task list's key.
 * @param taskId The task to find.
 * @returns The task, or undefined when the list is not loaded or does not hold it.
 */
export function cachedTeamTaskOf(cachedList: unknown, taskId: string): TTask | undefined {
	const isObject = typeof cachedList === 'object' && cachedList !== null;
	if (!isObject) {
		return undefined;
	}
	const { pages, items } = cachedList as { pages?: TaskPage[]; items?: TTask[] };
	const listedPages: TaskPage[] = Array.isArray(pages) ? pages : [{ items }];
	for (const page of listedPages) {
		const found = (page?.items ?? []).find((task) => task.id === taskId);
		if (found) {
			return found;
		}
	}
	return undefined;
}
