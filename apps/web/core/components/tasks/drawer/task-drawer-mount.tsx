'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTitle, floatingSheetSurface } from '@/core/components/common/sheet';
import { cn } from '@/core/lib/helpers';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { taskDrawerState } from '@/core/stores/tasks/task-drawer';
import { TaskDrawerSkeleton } from './task-drawer-skeleton';

const DRAWER_SURFACE = cn(floatingSheetSurface, 'w-[min(50rem,calc(100vw-1rem))]');

const LazyTaskDrawerContent = dynamic(
	() => import('./global-task-drawer').then((module) => ({ default: module.GlobalTaskDrawerContent })),
	{ ssr: false, loading: () => <TaskDrawerSkeleton /> }
);

/** The drawer belongs to the page it was opened on: following a link out of it closes it. */
function useCloseOnLeavingPage(isOpen: boolean, openedOn: string | null, close: () => void) {
	const pathname = usePathname();
	const wasOpenedHere = openedOn === null || openedOn === pathname;
	const hasLeftPage = isOpen && !wasOpenedHere;
	useEffect(() => {
		if (hasLeftPage) {
			close();
		}
	}, [hasLeftPage, close]);
}

/**
 * The app's one task drawer, mounted in the main layout. The panel itself is always there, so it slides in on the
 * first open too; what it shows is loaded the first time a task is opened, while it slides.
 */
export function TaskDrawerMount() {
	const t = useTranslations();
	const { taskId, isOpen, openedOn } = useAtomValue(taskDrawerState);
	const { closeTaskDrawer } = useTaskDrawer();
	const popupRef = useRef<HTMLDivElement>(null);
	useCloseOnLeavingPage(isOpen, openedOn, closeTaskDrawer);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			closeTaskDrawer();
		}
	};

	return (
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetContent
				ref={popupRef}
				side="right"
				showCloseButton={false}
				initialFocus={popupRef}
				className={DRAWER_SURFACE}
			>
				<SheetTitle className="sr-only">{t('taskDrawer.TASK_DETAILS')}</SheetTitle>
				{taskId && <LazyTaskDrawerContent taskId={taskId} />}
			</SheetContent>
		</Sheet>
	);
}
