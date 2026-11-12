'use client';

import { useTranslations } from 'next-intl';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { Copy, Play } from '@/core/components/icons';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/**
 * Continue and Duplicate, as a page offers them on its time entries. `canContinue` and `canDuplicate` are asked when
 * a menu or a popover opens, never while a list of rows renders.
 */
export interface TimeEntryReuseHandlers {
	canContinue: (log: ITimeLog) => boolean;
	continueLog: (log: ITimeLog) => void;
	canDuplicate: (log: ITimeLog) => boolean;
	duplicate: (log: ITimeLog) => void;
}

export function TimeEntryReuseMenuItems({
	log,
	reuse,
	isFollowed = false
}: Readonly<{ log: ITimeLog; reuse: TimeEntryReuseHandlers; isFollowed?: boolean }>) {
	const t = useTranslations();
	const showsContinue = reuse.canContinue(log);
	const showsDuplicate = reuse.canDuplicate(log);
	const showsAny = showsContinue || showsDuplicate;
	if (!showsAny) {
		return null;
	}
	return (
		<>
			{showsContinue && (
				<DropdownMenuItem onClick={() => reuse.continueLog(log)}>
					<Play />
					<span>{t('timeEntryActions.CONTINUE')}</span>
				</DropdownMenuItem>
			)}
			{showsDuplicate && (
				<DropdownMenuItem onClick={() => reuse.duplicate(log)}>
					<Copy />
					<span>{t('timeEntryActions.DUPLICATE')}</span>
				</DropdownMenuItem>
			)}
			{isFollowed && <DropdownMenuSeparator />}
		</>
	);
}

export function TimeEntryReuseButtons({
	log,
	reuse,
	onAct
}: Readonly<{ log: ITimeLog; reuse: TimeEntryReuseHandlers; onAct: () => void }>) {
	const t = useTranslations();
	const showsContinue = reuse.canContinue(log);
	const showsDuplicate = reuse.canDuplicate(log);

	const continueLog = () => {
		onAct();
		reuse.continueLog(log);
	};
	const duplicate = () => {
		onAct();
		reuse.duplicate(log);
	};

	return (
		<>
			{showsContinue && (
				<Button type="button" variant="ghost" size="sm" onClick={continueLog}>
					<Play />
					<span>{t('timeEntryActions.CONTINUE')}</span>
				</Button>
			)}
			{showsDuplicate && (
				<Button type="button" variant="ghost" size="sm" onClick={duplicate}>
					<Copy />
					<span>{t('timeEntryActions.DUPLICATE')}</span>
				</Button>
			)}
		</>
	);
}
