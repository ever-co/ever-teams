'use client';

import { createContext, useContext, type ReactNode } from 'react';

type TaskDetailHost = 'page' | 'drawer' | 'dialog';

const TaskDetailHostContext = createContext<TaskDetailHost>('page');

export function TaskDetailHostProvider({ host, children }: Readonly<{ host: TaskDetailHost; children: ReactNode }>) {
	return <TaskDetailHostContext.Provider value={host}>{children}</TaskDetailHostContext.Provider>;
}

export function useTaskDetailHost() {
	return useContext(TaskDetailHostContext);
}

/**
 * The legacy Headless UI dialogs (create a status, a priority, a size, a version) trap focus on their own: opened from
 * inside a Base UI sheet or dialog, the two traps fight. Only the page offers them.
 */
export function allowsLegacyDialogs(host: TaskDetailHost) {
	return host === 'page';
}
