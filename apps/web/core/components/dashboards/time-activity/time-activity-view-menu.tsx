'use client';

import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { SlidersHorizontal } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	type TimeActivityColumn,
	type TimeActivityGrouping,
	offersProjectsColumn
} from '@/core/lib/utils/dashboards/time-activity';

const COLUMN_LABEL_KEYS: Record<TimeActivityColumn, DottedLanguageObjectStringPaths> = {
	project: 'dashboard.timeActivity.columns.PROJECTS',
	tracked: 'dashboard.timeActivity.columns.TRACKED',
	earnings: 'dashboard.timeActivity.columns.EARNINGS',
	activity: 'dashboard.timeActivity.columns.ACTIVITY'
};

/** Earnings are a manager's column; projects are a column only where they are not rows of the breakdown. */
function columnsOfferedFor(grouping: TimeActivityGrouping, isManager: boolean): TimeActivityColumn[] {
	const offered: TimeActivityColumn[] = [];
	if (offersProjectsColumn(grouping)) {
		offered.push('project');
	}
	offered.push('tracked');
	if (isManager) {
		offered.push('earnings');
	}
	offered.push('activity');
	return offered;
}

function ColumnToggle({
	label,
	isOn,
	isDisabled,
	onToggle
}: Readonly<{ label: string; isOn: boolean; isDisabled: boolean; onToggle: () => void }>) {
	return (
		<button
			type="button"
			aria-pressed={isOn}
			disabled={isDisabled}
			onClick={onToggle}
			className={cn(
				'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium outline-none transition-colors hairline-ring ring-foreground/10 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50',
				isOn && 'bg-foreground/[0.07] text-foreground',
				!isOn && 'text-muted-foreground hover:text-foreground'
			)}
		>
			{label}
		</button>
	);
}

export function TimeActivityViewMenu({
	grouping,
	isManager,
	hiddenColumns,
	onToggleColumn
}: Readonly<{
	grouping: TimeActivityGrouping;
	isManager: boolean;
	hiddenColumns: ReadonlyArray<TimeActivityColumn>;
	onToggleColumn: (column: TimeActivityColumn) => void;
}>) {
	const t = useTranslations();
	const isWeekGrid = grouping === 'week';
	const offered = columnsOfferedFor(grouping, isManager);
	const viewLabel = t('common.VIEW');

	return (
		<Popover>
			<PopoverTrigger render={<Button variant="outline" size="default" aria-label={viewLabel} />}>
				<SlidersHorizontal />
				<span className="max-sm:hidden">{viewLabel}</span>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="w-72 p-0">
				<div className="px-3 pt-2.5 pb-3">
					<p className="pb-2 text-xs font-medium text-muted-foreground">
						{t('dashboard.timeActivity.view.COLUMNS')}
					</p>
					<div className="flex flex-wrap gap-1.5">
						{offered.map((column) => (
							<ColumnToggle
								key={column}
								label={t(COLUMN_LABEL_KEYS[column])}
								isOn={!hiddenColumns.includes(column)}
								isDisabled={isWeekGrid}
								onToggle={() => onToggleColumn(column)}
							/>
						))}
					</div>
					{isWeekGrid && (
						<p className="pt-2.5 text-xs text-muted-foreground text-pretty">
							{t('dashboard.timeActivity.view.WEEK_NOTE_V2')}
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
