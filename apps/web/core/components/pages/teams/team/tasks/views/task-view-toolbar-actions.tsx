'use client';

import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { Bookmark, MoreHorizontal } from '@/core/components/icons';
import { ETaskViewVisibility, type ITaskView } from '@/core/types/interfaces/common/task-views';

/** What the toolbar can ask of a saved view's page. */
export interface TaskViewToolbarCommands {
	save: () => void;
	saveAs: () => void;
	rename: () => void;
	toggleVisibility: () => void;
	remove: () => void;
}

/**
 * The actions of the toolbar for a saved view (Save when the list changed, a menu with Save as, Rename, Share /
 * Make personal, Delete), or just "Save view" on the plain team tasks page.
 */
export function TaskViewToolbarActions({
	view,
	isDirty,
	isBusy,
	commands
}: Readonly<{ view: ITaskView | null; isDirty: boolean; isBusy: boolean; commands: TaskViewToolbarCommands }>) {
	const t = useTranslations();
	if (!view) {
		return (
			<Button variant="outline" size="sm" className="h-8" onClick={commands.saveAs} disabled={isBusy}>
				<Bookmark />
				{t('taskViews.SAVE_VIEW')}
			</Button>
		);
	}
	const isShared = view.visibility !== ETaskViewVisibility.PERSONAL;
	return (
		<div className="flex items-center gap-1">
			{isDirty && (
				<Button size="sm" className="h-8" onClick={commands.save} disabled={isBusy}>
					<Bookmark />
					{t('taskViews.SAVE')}
				</Button>
			)}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('taskViews.ACTIONS')} disabled={isBusy}>
						<MoreHorizontal />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={commands.saveAs}>{t('taskViews.SAVE_AS')}</DropdownMenuItem>
					<DropdownMenuItem onClick={commands.rename}>{t('taskViews.RENAME')}</DropdownMenuItem>
					<DropdownMenuItem onClick={commands.toggleVisibility}>{isShared ? t('taskViews.MAKE_PERSONAL') : t('taskViews.MAKE_SHARED')}</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={commands.remove} className="text-destructive">
						{t('taskViews.DELETE')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
