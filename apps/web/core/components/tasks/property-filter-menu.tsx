'use client';

import type { ReactNode } from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { useTranslations } from 'next-intl';
import type { TStatus, TStatusItem } from '@/core/types/interfaces/task/task-card';
import { TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import type { TaskPropertyKind } from '@/core/components/tasks/task-property-icon';
import { MENU_POPUP_RECIPE, MENU_ROW_RECIPE } from '@/core/components/tasks/task-property-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronRight, Filter, X } from '@/core/components/icons';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { cn } from '@/core/lib/helpers';

export type PropertyFilterOption = Required<Pick<TStatusItem, 'value'>> & Pick<TStatusItem, 'name' | 'icon'>;

export interface PropertyFilterCategory<F extends string> {
	field: F;
	kind?: TaskPropertyKind;
	icon?: ReactNode;
	label: string;
	options: PropertyFilterOption[];
	/** Names written by people (members, tasks, projects) keep their own case; property values are capitalised. */
	keepsCase?: boolean;
}

export type PropertyFilterSelection<F extends string> = Partial<Record<F, string[]>>;

const POSITIONER = 'z-[1000] outline-hidden';

const ROW = cn(
	MENU_ROW_RECIPE,
	'data-highlighted:bg-foreground/5 data-popup-open:bg-foreground/5 data-disabled:pointer-events-none data-disabled:opacity-50'
);

const COUNT_CHIP = 'rounded-sm bg-primary/10 px-1.5 text-xs font-medium tabular-nums text-primary-ink';

/** The options of a status, priority, size or label map, each keyed by its value. */
export function propertyFilterOptionsOf(values: TStatus<string>): PropertyFilterOption[] {
	return Object.entries(values).map(([key, item]) => ({ ...item, value: item.value || key }));
}

function selectedValuesOf<F extends string>(selection: PropertyFilterSelection<F> | undefined, field: F) {
	const values = selection?.[field];
	if (!values) {
		return [];
	}
	return values;
}

function withToggled(values: string[], value: string, checked: boolean) {
	const withoutValue = values.filter((current) => current !== value);
	if (checked) {
		return [...withoutValue, value];
	}
	return withoutValue;
}

function activeFilterCountOf<F extends string>(selection: PropertyFilterSelection<F> | undefined) {
	if (!selection) {
		return 0;
	}
	let count = 0;
	for (const values of Object.values<string[] | undefined>(selection)) {
		count += values?.length ?? 0;
	}
	return count;
}

/**
 * A task filter on the mechanism of Linear's "Add filter" menu (one row per property, a submenu of checkable
 * values, each choice applied at once, the active counts on the rows and the trigger) drawn with the surface, rows
 * and coloured glyphs of the app's own property menus (`TaskPropertyMenu`). Used by the profile and the Kanban.
 */
export function PropertyFilterMenu<F extends string>({
	categories,
	selection,
	onChange,
	onClear,
	triggerClassName
}: Readonly<{
	categories: PropertyFilterCategory<F>[];
	selection: PropertyFilterSelection<F> | undefined;
	onChange: (field: F, values: string[]) => void;
	onClear: () => void;
	triggerClassName?: string;
}>) {
	const t = useTranslations();
	const activeFilterCount = activeFilterCountOf(selection);
	const hasActiveFilters = activeFilterCount > 0;

	return (
		<MenuPrimitive.Root>
			<MenuPrimitive.Trigger
				render={<Button variant="outline" size="default" className={cn('shrink-0', triggerClassName)} />}
			>
				<Filter />
				<span>{t('common.FILTER')}</span>
				{hasActiveFilters && <span className={COUNT_CHIP}>{activeFilterCount}</span>}
			</MenuPrimitive.Trigger>
			<MenuPrimitive.Portal>
				<MenuPrimitive.Positioner className={POSITIONER} align="end" sideOffset={6}>
					<MenuPrimitive.Popup className={cn(MENU_POPUP_RECIPE, 'w-56 p-1')}>
						{categories.map((category) => (
							<FilterCategorySubmenu
								key={category.field}
								category={category}
								selectedValues={selectedValuesOf(selection, category.field)}
								onChange={(values) => onChange(category.field, values)}
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

function CategoryIcon<F extends string>({ category }: Readonly<{ category: PropertyFilterCategory<F> }>) {
	if (category.icon) {
		return (
			<span
				aria-hidden="true"
				className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
			>
				{category.icon}
			</span>
		);
	}
	if (!category.kind) {
		return null;
	}
	return <TaskPropertyPlaceholderIcon kind={category.kind} />;
}

function FilterCategorySubmenu<F extends string>({
	category,
	selectedValues,
	onChange
}: Readonly<{
	category: PropertyFilterCategory<F>;
	selectedValues: string[];
	onChange: (values: string[]) => void;
}>) {
	const selectedCount = selectedValues.length;
	const hasSelection = selectedCount > 0;
	const hasOptions = category.options.length > 0;

	return (
		<MenuPrimitive.SubmenuRoot>
			<MenuPrimitive.SubmenuTrigger className={ROW} disabled={!hasOptions}>
				<CategoryIcon category={category} />
				<span className="min-w-0 flex-1 truncate">{category.label}</span>
				{hasSelection && <span className={COUNT_CHIP}>{selectedCount}</span>}
				<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
			</MenuPrimitive.SubmenuTrigger>
			<MenuPrimitive.Portal>
				<MenuPrimitive.Positioner
					className={POSITIONER}
					side="left"
					align="start"
					sideOffset={6}
					alignOffset={-4}
				>
					<MenuPrimitive.Popup className={cn(MENU_POPUP_RECIPE, 'w-48')}>
						<div className="max-h-80 overflow-y-auto p-1">
							{category.options.map((option) => (
								<FilterOptionRow
									key={option.value}
									option={option}
									selectedValues={selectedValues}
									onChange={onChange}
									keepsCase={category.keepsCase}
								/>
							))}
						</div>
					</MenuPrimitive.Popup>
				</MenuPrimitive.Positioner>
			</MenuPrimitive.Portal>
		</MenuPrimitive.SubmenuRoot>
	);
}

function FilterOptionRow({
	option,
	selectedValues,
	onChange,
	keepsCase = false
}: Readonly<{
	option: PropertyFilterOption;
	selectedValues: string[];
	onChange: (values: string[]) => void;
	keepsCase?: boolean;
}>) {
	const isChecked = selectedValues.includes(option.value);
	const handleCheckedChange = (checked: boolean) => {
		const nextValues = withToggled(selectedValues, option.value, checked);
		onChange(nextValues);
	};
	const icon: ReactNode = option.icon;

	return (
		<MenuPrimitive.CheckboxItem
			closeOnClick={false}
			className={ROW}
			checked={isChecked}
			onCheckedChange={handleCheckedChange}
		>
			<span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
			<span className={cn('min-w-0 flex-1 truncate', !keepsCase && 'capitalize')}>{option.name}</span>
			<MenuPrimitive.CheckboxItemIndicator>
				<SelectedMark />
			</MenuPrimitive.CheckboxItemIndicator>
		</MenuPrimitive.CheckboxItem>
	);
}
