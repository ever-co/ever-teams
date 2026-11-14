'use client';

import { useId } from 'react';
import { Switch } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SWITCH_THUMB_RECIPE, SWITCH_TRACK_RECIPE } from '@/core/components/common/switch-recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { SlidersHorizontal } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

const SWITCH_TRACK = cn(SWITCH_TRACK_RECIPE, 'mt-0.5 h-5 w-8.5');

const SWITCH_THUMB = cn(SWITCH_THUMB_RECIPE, 'size-3.5 group-data-checked:translate-x-3.5');

/**
 * The View menu of the Timesheets list, beside its view switch, as the other reports have one: whether a day's entries
 * that record the same work show as one row.
 */
export function TimesheetsViewMenu({
	isGrouping,
	onGroupingChange
}: Readonly<{ isGrouping: boolean; onGroupingChange: (isGrouping: boolean) => void }>) {
	const t = useTranslations();
	const helpId = useId();
	const viewLabel = t('common.VIEW');
	const groupingLabel = t('dashboard.timesheets.SIMILAR.VIEW_GROUP');
	return (
		<Popover>
			<PopoverTrigger render={<Button variant="outline" size="default" aria-label={viewLabel} />}>
				<SlidersHorizontal />
				<span className="max-sm:hidden">{viewLabel}</span>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="w-72 p-0">
				<div className="flex items-start gap-3 px-3 py-2.5">
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="text-[13px] font-medium text-foreground">{groupingLabel}</span>
						<span id={helpId} className="text-xs text-muted-foreground text-pretty">
							{t('dashboard.timesheets.SIMILAR.VIEW_GROUP_HELP')}
						</span>
					</div>
					<Switch
						checked={isGrouping}
						onChange={onGroupingChange}
						aria-label={groupingLabel}
						aria-describedby={helpId}
						className={SWITCH_TRACK}
					>
						<span aria-hidden="true" className={SWITCH_THUMB} />
					</Switch>
				</div>
			</PopoverContent>
		</Popover>
	);
}
