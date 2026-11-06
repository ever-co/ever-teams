'use client';

import { type ReactNode, memo } from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronRight, Filter, Folder, Task, Users, UsersGroup, X } from '@/core/components/icons';
import { MENU_POPUP_RECIPE, MENU_ROW_RECIPE } from '@/core/components/tasks/task-property-menu';
import type {
	TimeActivityFilterOption,
	TimeActivityFilterOptions
} from '@/core/hooks/dashboards/time-activity/use-time-activity-filter-options';
import { cn } from '@/core/lib/helpers';
import {
	TIME_ACTIVITY_FILTER_FIELDS,
	type TimeActivityFilterField,
	type TimeActivityFilters
} from '@/core/lib/utils/dashboards/time-activity';
import { PersonGlyph } from './time-activity-cells';

const POSITIONER = 'z-[1000] outline-hidden';

const ROW = cn(
	MENU_ROW_RECIPE,
	'data-highlighted:bg-foreground/5 data-popup-open:bg-foreground/5 data-disabled:pointer-events-none data-disabled:opacity-60'
);

const COUNT_CHIP = 'rounded-sm bg-primary/10 px-1.5 text-xs font-medium tabular-nums text-primary-ink';

const LABEL_KEYS: Record<TimeActivityFilterField, DottedLanguageObjectStringPaths> = {
	teamIds: 'dashboard.timeActivity.filters.TEAMS',
	employeeIds: 'dashboard.timeActivity.filters.MEMBERS',
	projectIds: 'dashboard.timeActivity.filters.PROJECTS',
	taskIds: 'dashboard.timeActivity.filters.TASKS'
};

const FIELD_ICONS: Record<TimeActivityFilterField, ReactNode> = {
	teamIds: <UsersGroup />,
	employeeIds: <Users />,
	projectIds: <Folder />,
	taskIds: <Task />
};

const SUBMENU_WIDTHS: Record<TimeActivityFilterField, string> = {
	teamIds: 'w-56',
	employeeIds: 'w-60',
	projectIds: 'w-60',
	taskIds: 'w-80'
};

function FilterOptionGlyph({
	field,
	option
}: Readonly<{ field: TimeActivityFilterField; option: TimeActivityFilterOption }>) {
	if (field === 'employeeIds') {
		return <PersonGlyph name={option.name} imageUrl={option.imageUrl} />;
	}
	if (field === 'taskIds') {
		return null;
	}
	return (
		<EntityTile name={option.name} color={option.color} imageUrl={option.imageUrl} className="size-4 text-[7px]" />
	);
}

function FilterOptionName({ option }: Readonly<{ option: TimeActivityFilterOption }>) {
	return (
		<span className="min-w-0 flex-1 truncate">
			{option.prefix && <span className="mr-1.5 tabular-nums text-muted-foreground">{option.prefix}</span>}
			{option.name}
		</span>
	);
}

function withToggled(values: ReadonlyArray<string>, value: string, checked: boolean) {
	const withoutValue = values.filter((current) => current !== value);
	if (checked) {
		return [...withoutValue, value];
	}
	return withoutValue;
}

const FilterOptionRow = memo(function FilterOptionRow({
	field,
	option,
	isChecked,
	selectedValues,
	onChange
}: Readonly<{
	field: TimeActivityFilterField;
	option: TimeActivityFilterOption;
	isChecked: boolean;
	selectedValues: ReadonlyArray<string>;
	onChange: (field: TimeActivityFilterField, values: string[]) => void;
}>) {
	const handleCheckedChange = (checked: boolean) => {
		const nextValues = withToggled(selectedValues, option.value, checked);
		onChange(field, nextValues);
	};
	return (
		<MenuPrimitive.CheckboxItem
			closeOnClick={false}
			label={option.name}
			className={ROW}
			checked={isChecked}
			onCheckedChange={handleCheckedChange}
		>
			<FilterOptionGlyph field={field} option={option} />
			<FilterOptionName option={option} />
			<MenuPrimitive.CheckboxItemIndicator>
				<SelectedMark />
			</MenuPrimitive.CheckboxItemIndicator>
		</MenuPrimitive.CheckboxItem>
	);
});

function FilterFieldSubmenu({
	field,
	options,
	selectedValues,
	onChange
}: Readonly<{
	field: TimeActivityFilterField;
	options: ReadonlyArray<TimeActivityFilterOption>;
	selectedValues: ReadonlyArray<string>;
	onChange: (field: TimeActivityFilterField, values: string[]) => void;
}>) {
	const t = useTranslations();
	const selectedCount = selectedValues.length;
	const hasSelection = selectedCount > 0;
	const hasOptions = options.length > 0;
	const isUnavailable = !hasOptions && !hasSelection;

	return (
		<MenuPrimitive.SubmenuRoot>
			<MenuPrimitive.SubmenuTrigger className={ROW} disabled={isUnavailable}>
				<span
					aria-hidden="true"
					className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
				>
					{FIELD_ICONS[field]}
				</span>
				<span className="min-w-0 flex-1 truncate">{t(LABEL_KEYS[field])}</span>
				{hasSelection && <span className={COUNT_CHIP}>{selectedCount}</span>}
				{isUnavailable && (
					<span className="text-xs text-muted-foreground">{t('dashboard.timeActivity.filters.NONE')}</span>
				)}
				{!isUnavailable && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
			</MenuPrimitive.SubmenuTrigger>
			<MenuPrimitive.Portal>
				<MenuPrimitive.Positioner className={POSITIONER} align="start" sideOffset={6} alignOffset={-4}>
					<MenuPrimitive.Popup className={cn(MENU_POPUP_RECIPE, SUBMENU_WIDTHS[field])}>
						<div className="max-h-80 overflow-y-auto p-1">
							{options.map((option) => (
								<FilterOptionRow
									key={option.value}
									field={field}
									option={option}
									isChecked={selectedValues.includes(option.value)}
									selectedValues={selectedValues}
									onChange={onChange}
								/>
							))}
						</div>
						{hasSelection && (
							<div className="p-1 hairline-t border-border">
								<MenuPrimitive.Item
									className={ROW}
									closeOnClick={false}
									onClick={() => onChange(field, [])}
								>
									<X className="size-4 shrink-0 text-muted-foreground" />
									<span className="min-w-0 flex-1 truncate">{t('common.CLEAR')}</span>
								</MenuPrimitive.Item>
							</div>
						)}
					</MenuPrimitive.Popup>
				</MenuPrimitive.Positioner>
			</MenuPrimitive.Portal>
		</MenuPrimitive.SubmenuRoot>
	);
}

/** Built beside `PropertyFilterMenu`, whose rows capitalise every word: task titles and names keep their own case here. */
export function TimeActivityFilterMenu({
	options,
	filters,
	activeFilterCount,
	onChange,
	onClear
}: Readonly<{
	options: TimeActivityFilterOptions;
	filters: TimeActivityFilters;
	activeFilterCount: number;
	onChange: (field: TimeActivityFilterField, values: string[]) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const hasActiveFilters = activeFilterCount > 0;

	return (
		<MenuPrimitive.Root>
			<MenuPrimitive.Trigger render={<Button variant="outline" size="default" className="shrink-0" />}>
				<Filter />
				<span>{t('common.FILTER')}</span>
				{hasActiveFilters && <span className={COUNT_CHIP}>{activeFilterCount}</span>}
			</MenuPrimitive.Trigger>
			<MenuPrimitive.Portal>
				<MenuPrimitive.Positioner className={POSITIONER} align="start" sideOffset={6}>
					<MenuPrimitive.Popup className={cn(MENU_POPUP_RECIPE, 'w-56 p-1')}>
						{TIME_ACTIVITY_FILTER_FIELDS.map((field) => (
							<FilterFieldSubmenu
								key={field}
								field={field}
								options={options[field]}
								selectedValues={filters[field]}
								onChange={onChange}
							/>
						))}
						{hasActiveFilters && (
							<>
								<MenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />
								<MenuPrimitive.Item className={ROW} onClick={onClear}>
									<X className="size-4 shrink-0 text-muted-foreground" />
									<span className="min-w-0 flex-1 truncate">{t('common.CLEAR_FILTERS')}</span>
								</MenuPrimitive.Item>
							</>
						)}
					</MenuPrimitive.Popup>
				</MenuPrimitive.Positioner>
			</MenuPrimitive.Portal>
		</MenuPrimitive.Root>
	);
}

interface AppliedFilter {
	field: TimeActivityFilterField;
	value: string;
	option: TimeActivityFilterOption | undefined;
}

const MAX_SHOWN_CHIPS = 8;

function appliedFiltersOf(filters: TimeActivityFilters, options: TimeActivityFilterOptions) {
	const applied: AppliedFilter[] = [];
	for (const field of TIME_ACTIVITY_FILTER_FIELDS) {
		for (const value of filters[field]) {
			const option = options[field].find((candidate) => candidate.value === value);
			applied.push({ field, value, option });
		}
	}
	return applied;
}

export function AppliedTimeActivityFilters({
	filters,
	options,
	onRemove,
	onClear
}: Readonly<{
	filters: TimeActivityFilters;
	options: TimeActivityFilterOptions;
	onRemove: (field: TimeActivityFilterField, value: string) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const applied = appliedFiltersOf(filters, options);
	const hasApplied = applied.length > 0;
	if (!hasApplied) {
		return null;
	}
	const shown = applied.slice(0, MAX_SHOWN_CHIPS);
	const hiddenCount = applied.length - shown.length;
	const hasHidden = hiddenCount > 0;

	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-3">
			{shown.map((filter) => {
				const name = filter.option?.name ?? t('dashboard.timeActivity.filters.UNLISTED');
				return (
					<span
						key={`${filter.field}:${filter.value}`}
						className="inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10"
					>
						<span className="shrink-0 text-muted-foreground">{t(LABEL_KEYS[filter.field])}:</span>
						{filter.option && <FilterOptionGlyph field={filter.field} option={filter.option} />}
						<span className="truncate font-medium text-foreground">{name}</span>
						<button
							type="button"
							aria-label={t('dashboard.timeActivity.filters.REMOVE', { value: name })}
							onClick={() => onRemove(filter.field, filter.value)}
							className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none"
						>
							<X className="size-3" />
						</button>
					</span>
				);
			})}
			{hasHidden && (
				<span className="text-xs tabular-nums text-muted-foreground">
					{t('dashboard.timeActivity.filters.MORE', { count: hiddenCount })}
				</span>
			)}
			<button
				type="button"
				onClick={onClear}
				className="h-7 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none"
			>
				{t('common.CLEAR_FILTERS')}
			</button>
		</div>
	);
}
