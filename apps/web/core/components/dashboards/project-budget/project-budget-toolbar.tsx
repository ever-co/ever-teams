'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Clock, DollarCircle, Folder, StatusCircle, Wallet, X } from '@/core/components/icons';
import {
	PropertyFilterMenu,
	type PropertyFilterCategory,
	type PropertyFilterOption
} from '@/core/components/tasks/property-filter-menu';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import {
	BUDGET_RISKS,
	type BudgetFilterField,
	type BudgetFilters,
	type BudgetProject,
	type BudgetRisk,
	type BudgetScope
} from '@/core/lib/utils/dashboards/project-budget';
import { ProjectMark, riskLabelKeyOf, RiskDot, typeTextOf } from './budget-cells';

type Translate = ReturnType<typeof useTranslations>;

export function BudgetScopeControl({
	scope,
	onScopeChange
}: Readonly<{ scope: BudgetScope; onScopeChange: (scope: BudgetScope) => void }>) {
	const t = useTranslations();
	const items = [
		{ value: 'whole' as const, label: t('dashboard.projectBudget.SCOPE_WHOLE') },
		{ value: 'period' as const, label: t('dashboard.projectBudget.SCOPE_PERIOD') }
	];
	return (
		<SegmentedControl<BudgetScope>
			items={items}
			value={scope}
			onValueChange={onScopeChange}
			ariaLabel={t('dashboard.projectBudget.SCOPE_LABEL')}
		/>
	);
}

export interface BudgetFilterOptions {
	projects: ReadonlyArray<BudgetProject>;
	budgetTypes: ReadonlyArray<EProjectBudgetType>;
	risks: ReadonlyArray<BudgetRisk>;
}

function byName(first: PropertyFilterOption, second: PropertyFilterOption) {
	const firstName = first.name ?? '';
	const secondName = second.name ?? '';
	return firstName.localeCompare(secondName);
}

function projectOptionsOf(projects: ReadonlyArray<BudgetProject>): PropertyFilterOption[] {
	const options = projects.map((project) => ({
		value: project.id,
		name: project.name,
		icon: <ProjectMark project={project} className="size-4" />
	}));
	options.sort(byName);
	return options;
}

function budgetTypeIconOf(budgetType: EProjectBudgetType): ReactNode {
	if (budgetType === EProjectBudgetType.HOURS) {
		return <Clock />;
	}
	return <DollarCircle />;
}

const BUDGET_TYPE_ORDER: ReadonlyArray<EProjectBudgetType> = [EProjectBudgetType.HOURS, EProjectBudgetType.COST];

function budgetTypeOptionsOf(budgetTypes: ReadonlyArray<EProjectBudgetType>, t: Translate): PropertyFilterOption[] {
	const present = BUDGET_TYPE_ORDER.filter((budgetType) => budgetTypes.includes(budgetType));
	return present.map((budgetType) => ({
		value: budgetType,
		name: typeTextOf({ budgetType, currency: null }, t),
		icon: budgetTypeIconOf(budgetType)
	}));
}

function riskOptionsOf(risks: ReadonlyArray<BudgetRisk>, scope: BudgetScope, t: Translate): PropertyFilterOption[] {
	const present = BUDGET_RISKS.filter((risk) => risks.includes(risk));
	return present.map((risk) => ({
		value: risk,
		name: t(riskLabelKeyOf(risk, scope)),
		icon: (
			<span className="flex size-4 items-center justify-center">
				<RiskDot risk={risk} />
			</span>
		)
	}));
}

function useBudgetFilterCategories(options: BudgetFilterOptions, scope: BudgetScope) {
	const t = useTranslations();
	return useMemo<PropertyFilterCategory<BudgetFilterField>[]>(
		() => [
			{
				field: 'projects',
				keepsCase: true,
				icon: <Folder />,
				label: t('dashboard.projectBudget.FILTER_PROJECTS'),
				options: projectOptionsOf(options.projects)
			},
			{
				field: 'budgetTypes',
				keepsCase: true,
				icon: <Wallet />,
				label: t('dashboard.projectBudget.FILTER_BUDGET_TYPE'),
				options: budgetTypeOptionsOf(options.budgetTypes, t)
			},
			{
				field: 'statuses',
				keepsCase: true,
				icon: <StatusCircle />,
				label: t('dashboard.projectBudget.FILTER_STATUS'),
				options: riskOptionsOf(options.risks, scope, t)
			}
		],
		[options, scope, t]
	);
}

interface AppliedFilter {
	field: BudgetFilterField;
	value: string;
	fieldLabel: string;
	name: string;
	icon: PropertyFilterOption['icon'];
}

function appliedFiltersOf(
	filters: BudgetFilters,
	categories: ReadonlyArray<PropertyFilterCategory<BudgetFilterField>>,
	knownNames: Readonly<Record<string, string>>
): AppliedFilter[] {
	const applied: AppliedFilter[] = [];
	for (const category of categories) {
		for (const value of filters[category.field]) {
			const option = category.options.find((candidate) => candidate.value === value);
			const name = option?.name ?? knownNames[value] ?? value;
			applied.push({ field: category.field, value, fieldLabel: category.label, name, icon: option?.icon });
		}
	}
	return applied;
}

function pickedNamesOf(category: PropertyFilterCategory<BudgetFilterField> | undefined, values: string[]) {
	const pickedNames: Record<string, string> = {};
	for (const option of category?.options ?? []) {
		const isPicked = values.includes(option.value);
		if (isPicked) {
			pickedNames[option.value] = option.name ?? option.value;
		}
	}
	return pickedNames;
}

/**
 * The filter menu and the chips of what it applies. Filters narrow the loaded projects on the page, so picking one
 * is instant; a project picked in one scope keeps its name on its chip in a scope where it has no row.
 */
export function useBudgetFilterControls({
	filters,
	options,
	scope,
	onChange,
	onRemove,
	onClear
}: Readonly<{
	filters: BudgetFilters;
	options: BudgetFilterOptions;
	scope: BudgetScope;
	onChange: (field: BudgetFilterField, values: string[]) => void;
	onRemove: (field: BudgetFilterField, value: string) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const categories = useBudgetFilterCategories(options, scope);
	const [knownNames, setKnownNames] = useState<Record<string, string>>({});

	const handleChange = useCallback(
		(field: BudgetFilterField, values: string[]) => {
			const category = categories.find((candidate) => candidate.field === field);
			const pickedNames = pickedNamesOf(category, values);
			setKnownNames((current) => ({ ...current, ...pickedNames }));
			onChange(field, values);
		},
		[categories, onChange]
	);

	const applied = appliedFiltersOf(filters, categories, knownNames);
	const hasApplied = applied.length > 0;

	const menu = (
		<PropertyFilterMenu categories={categories} selection={filters} onChange={handleChange} onClear={onClear} />
	);

	const chips = hasApplied && (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-3">
			{applied.map((filter) => (
				<span
					key={`${filter.field}:${filter.value}`}
					className="inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10"
				>
					<span className="shrink-0 text-muted-foreground">{filter.fieldLabel}:</span>
					{filter.icon && (
						<span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5">
							{filter.icon}
						</span>
					)}
					<span className="truncate font-medium text-foreground">{filter.name}</span>
					<button
						type="button"
						aria-label={t('dashboard.projectBudget.REMOVE_FILTER', { value: filter.name })}
						onClick={() => onRemove(filter.field, filter.value)}
						className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						<X className="size-3" />
					</button>
				</span>
			))}
			<button
				type="button"
				onClick={onClear}
				className="h-7 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{t('common.CLEAR_FILTERS')}
			</button>
		</div>
	);

	return { menu, chips };
}
