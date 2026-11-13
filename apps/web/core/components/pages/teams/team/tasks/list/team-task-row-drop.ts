import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { TaskOrderMove } from '@/core/lib/utils/task-view-order';

/**
 * Pragmatic drag and drop passes plain records, so a private symbol tells the list's rows from anything else dragged
 * over the page.
 */
const ROW_KEY = Symbol('team-task-row');

type TeamTaskRowData = { [ROW_KEY]: true; taskId: string; groupKey: string };

export function teamTaskRowData(taskId: string, groupKey: string): TeamTaskRowData {
	return { [ROW_KEY]: true, taskId, groupKey };
}

export function isTeamTaskRowData(data: Record<string | symbol, unknown>): data is TeamTaskRowData {
	return data[ROW_KEY] === true;
}

/**
 * The move a row dropped on another one makes: before it on its top half, after it on its bottom half. A task moves
 * inside its group only (moving it to another group would change the property the list is grouped by).
 */
export function rowMoveOf(source: TeamTaskRowData, target: TeamTaskRowData, edge: Edge | null): TaskOrderMove | null {
	const isSameGroup = source.groupKey === target.groupKey;
	const isOther = source.taskId !== target.taskId;
	if (!isSameGroup || !isOther || (edge !== 'top' && edge !== 'bottom')) {
		return null;
	}
	return { taskId: source.taskId, targetId: target.taskId, edge: edge === 'top' ? 'before' : 'after' };
}
