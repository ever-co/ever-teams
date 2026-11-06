'use client';

import type { ComponentProps, MouseEvent } from 'react';
import Link from 'next/link';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';

/** A modified click keeps the browser's own behaviour (a new tab, a new window); a plain one opens the drawer. */
export function isPlainClick(event: MouseEvent | globalThis.MouseEvent) {
	const hasModifier = [event.metaKey, event.ctrlKey, event.shiftKey, event.altKey].some(Boolean);
	const isPrimaryButton = event.button === 0;
	return isPrimaryButton && !hasModifier;
}

type TaskDrawerLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { taskId: string };

/**
 * A link to a task that opens it in the task drawer on a plain click and keeps the task page for a new tab, so
 * every task card of the app shows the task without leaving the page.
 */
export function TaskDrawerLink({ taskId, onClick, ...props }: Readonly<TaskDrawerLinkProps>) {
	const { openTaskDrawer } = useTaskDrawer();

	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		onClick?.(event);
		if (event.defaultPrevented) {
			return;
		}
		if (!isPlainClick(event)) {
			return;
		}
		event.preventDefault();
		openTaskDrawer(taskId);
	};

	return <Link href={`/task/${taskId}`} onClick={handleClick} {...props} />;
}
