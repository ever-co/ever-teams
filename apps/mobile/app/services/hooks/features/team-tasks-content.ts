import { getSnapshot, isStateTreeNode } from 'mobx-state-tree';
import type { IStateTreeNode, IType } from 'mobx-state-tree';

type TasksNode<T> = IStateTreeNode<IType<unknown, readonly T[], unknown>>;

/**
 * The team's tasks as a value that changes when their content does. The task store keeps one array and fills it in
 * place when new tasks arrive, so the array stays the same object: a memo that depends on it keeps the result it
 * computed while the array was empty. Its snapshot is a new object at each change, and the same one otherwise.
 */
export function teamTasksContentOf<T>(tasks: readonly T[]): readonly T[] {
	if (isStateTreeNode(tasks)) {
		return getSnapshot(tasks as TasksNode<T>);
	}
	return tasks;
}
