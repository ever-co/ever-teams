'use client';

import { useId, useMemo, type ChangeEvent, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { controlGroupRecipe } from '@/core/components/common/input';
import { RadioMark } from '@/core/components/common/radio-mark';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronsUpDown, Clock, Flag, MoneyBag, Tag, Timer } from '@/core/components/icons';
import { useProjectBudget } from '@/core/components/projects/project-cells';
import { TaskPropertyMenu, type TaskPropertyMenuOption } from '@/core/components/tasks/task-property-menu';
import { useCurrenciesOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { cn } from '@/core/lib/helpers';
import { PROJECT_BILLING_LABEL_KEYS, PROJECT_BUDGET_TYPE_LABEL_KEYS } from '@/core/lib/utils/project-composer';
import { EProjectBilling, EProjectBudgetType } from '@/core/types/generics/enums/project';
import { EMPTY_VALUE, PANEL_LABEL, VALUE_BUTTON } from './composer-recipes';
import { CurrencyGlyph, HueIconTile, currencySymbolOf, type GlyphHue } from '@/core/components/common/value-glyphs';

interface ProjectBudgetFieldProps {
	budget: number | null;
	budgetType: EProjectBudgetType;
	currency: string | null;
	billing: EProjectBilling;
	onBudgetChange: (budget: number | null) => void;
	onBudgetTypeChange: (budgetType: EProjectBudgetType) => void;
	onCurrencyChange: (currency: string) => void;
	onBillingChange: (billing: EProjectBilling) => void;
}

interface ChoiceOption<T extends string> {
	value: T;
	label: string;
	hint: string;
	icon: ReactNode;
	hue: GlyphHue;
}

const NO_CURRENCY_SYMBOL = '¤';

function useBillingOptions(): ChoiceOption<EProjectBilling>[] {
	const t = useTranslations();
	return [
		{
			value: EProjectBilling.RATE,
			label: t(PROJECT_BILLING_LABEL_KEYS[EProjectBilling.RATE]),
			hint: t('pages.projects.modals.budget.rateHint'),
			icon: <Timer />,
			hue: 'info'
		},
		{
			value: EProjectBilling.FLAT_FEE,
			label: t(PROJECT_BILLING_LABEL_KEYS[EProjectBilling.FLAT_FEE]),
			hint: t('pages.projects.modals.budget.flatFeeHint'),
			icon: <Tag />,
			hue: 'success'
		},
		{
			value: EProjectBilling.MILESTONES,
			label: t(PROJECT_BILLING_LABEL_KEYS[EProjectBilling.MILESTONES]),
			hint: t('pages.projects.modals.budget.milestonesHint'),
			icon: <Flag />,
			hue: 'warning'
		}
	];
}

function useBudgetTypeOptions(): ChoiceOption<EProjectBudgetType>[] {
	const t = useTranslations();
	return [
		{
			value: EProjectBudgetType.HOURS,
			label: t(PROJECT_BUDGET_TYPE_LABEL_KEYS[EProjectBudgetType.HOURS]),
			hint: t('pages.projects.modals.budget.hoursHint'),
			icon: <Clock />,
			hue: 'info'
		},
		{
			value: EProjectBudgetType.COST,
			label: t(PROJECT_BUDGET_TYPE_LABEL_KEYS[EProjectBudgetType.COST]),
			hint: t('pages.projects.modals.budget.costHint'),
			icon: <MoneyBag />,
			hue: 'success'
		}
	];
}

function amountFrom(event: ChangeEvent<HTMLInputElement>) {
	const raw = event.target.value;
	if (raw === '') {
		return null;
	}
	const amount = Number(raw);
	const isUsable = Number.isFinite(amount) && amount >= 0;
	if (!isUsable) {
		return null;
	}
	return amount;
}

function amountInputValue(budget: number | null) {
	if (budget === null) {
		return '';
	}
	return String(budget);
}

interface ChoiceGroupProps<T extends string> {
	name: string;
	legend: string;
	options: ChoiceOption<T>[];
	value: T;
	onChange: (value: T) => void;
}

/** Two big cards: what the budget counts changes the whole field, so the choice reads before anything else. */
function ChoiceCards<T extends string>({ name, legend, options, value, onChange }: ChoiceGroupProps<T>) {
	return (
		<fieldset className="flex min-w-0 flex-col gap-2">
			<legend className={cn(PANEL_LABEL, 'mb-2')}>{legend}</legend>
			<div className="grid grid-cols-2 gap-2">
				{options.map((option) => {
					const isChecked = option.value === value;
					return (
						<label
							key={option.value}
							className={cn(
								'relative flex cursor-pointer flex-col gap-2 rounded-xl p-3 outline-none transition-[background-color,box-shadow] has-focus-visible:ring-[3px] has-focus-visible:ring-ring/25',
								isChecked &&
									'bg-primary/[0.04] hairline-ring ring-primary/45 shadow-sm shadow-primary/10',
								!isChecked && 'bg-card hairline-ring ring-border hover:bg-foreground/[0.02]'
							)}
						>
							<input
								type="radio"
								name={name}
								value={option.value}
								checked={isChecked}
								onChange={() => onChange(option.value)}
								className="sr-only"
							/>
							<span className="flex items-start justify-between gap-2">
								<HueIconTile hue={option.hue}>{option.icon}</HueIconTile>
								<RadioMark isChecked={isChecked} />
							</span>
							<span className="flex flex-col gap-0.5">
								<span className="text-[13px] font-medium text-foreground">{option.label}</span>
								<span className="text-xs leading-snug text-muted-foreground">{option.hint}</span>
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

/** One row per option, its glyph, what it means and a radio mark: a single choice, readable at a glance. */
function ChoiceRows<T extends string>({ name, legend, options, value, onChange }: ChoiceGroupProps<T>) {
	return (
		<fieldset className="flex min-w-0 flex-col">
			<legend className={cn(PANEL_LABEL, 'mb-2')}>{legend}</legend>
			<div className="flex flex-col overflow-hidden rounded-xl bg-card hairline-ring ring-border hairline-divide-y divide-border">
				{options.map((option) => {
					const isChecked = option.value === value;
					return (
						<label
							key={option.value}
							className={cn(
								'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors has-focus-visible:bg-foreground/[0.04]',
								isChecked && 'bg-primary/[0.04]',
								!isChecked && 'hover:bg-foreground/[0.025]'
							)}
						>
							<input
								type="radio"
								name={name}
								value={option.value}
								checked={isChecked}
								onChange={() => onChange(option.value)}
								className="sr-only"
							/>
							<HueIconTile hue={option.hue} className="size-7 rounded-[8px] [&_svg]:size-3.5">
								{option.icon}
							</HueIconTile>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="text-[13px] font-medium text-foreground">{option.label}</span>
								<span className="text-xs leading-snug text-muted-foreground">{option.hint}</span>
							</span>
							<RadioMark isChecked={isChecked} />
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

function useCurrencyOptions() {
	const locale = useLocale();
	const { currencies } = useCurrenciesOwner();
	return useMemo<TaskPropertyMenuOption<string>[]>(
		() =>
			currencies.map((item) => ({
				key: item.isoCode,
				value: item.isoCode,
				label: `${item.isoCode} · ${item.currency}`,
				icon: <CurrencyGlyph symbol={currencySymbolOf(item.isoCode, locale)} />
			})),
		[currencies, locale]
	);
}

function currencySymbolOrPlaceholder(currency: string | null, locale: string) {
	if (!currency) {
		return NO_CURRENCY_SYMBOL;
	}
	return currencySymbolOf(currency, locale);
}

function CurrencyPicker({
	currency,
	onCurrencyChange
}: Readonly<{ currency: string | null; onCurrencyChange: (currency: string) => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const options = useCurrencyOptions();
	const hasCurrency = Boolean(currency);
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={(value) => value === currency}
			onSelect={onCurrencyChange}
			searchPlaceholder={t('pages.projects.financialSettingsForm.formFields.currencyPlaceholder')}
			triggerLabel={t('pages.projects.modals.budget.currencyLabel')}
			triggerClassName={cn(controlGroupRecipe, 'h-8 w-auto min-w-28 shrink-0 gap-2 px-2 text-[13px]')}
			popupClassName="w-72"
			align="end"
		>
			<CurrencyGlyph symbol={currencySymbolOrPlaceholder(currency, locale)} />
			{hasCurrency && <span className="flex-1 text-left font-medium tabular-nums">{currency}</span>}
			{!hasCurrency && (
				<span className={cn(EMPTY_VALUE, 'flex-1 text-left')}>
					{t('pages.projects.modals.budget.pickCurrency')}
				</span>
			)}
			<ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
		</TaskPropertyMenu>
	);
}

function AmountField({
	id,
	budget,
	budgetType,
	currency,
	onBudgetChange
}: Readonly<{
	id: string;
	budget: number | null;
	budgetType: EProjectBudgetType;
	currency: string | null;
	onBudgetChange: (budget: number | null) => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const isHours = budgetType === EProjectBudgetType.HOURS;
	let glyph = <CurrencyGlyph symbol={currencySymbolOrPlaceholder(currency, locale)} className="size-6 text-[11px]" />;
	let unit = currency ?? '';
	let hint = t('pages.projects.modals.budget.costAmountHint');
	if (isHours) {
		glyph = (
			<HueIconTile hue="info" className="size-6 rounded-full [&_svg]:size-3.5">
				<Clock />
			</HueIconTile>
		);
		unit = t('pages.projects.modals.budget.hoursUnit', { count: budget ?? 0 });
		hint = t('pages.projects.modals.budget.hoursAmountHint');
	}
	const hasUnit = unit.length > 0;
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className={PANEL_LABEL}>
				{t('pages.projects.modals.budget.amountLabel')}
			</label>
			<div className={cn(controlGroupRecipe, 'h-10 gap-2.5 pr-3 pl-2')}>
				{glyph}
				<input
					id={id}
					type="number"
					inputMode="decimal"
					min={0}
					value={amountInputValue(budget)}
					onChange={(event) => onBudgetChange(amountFrom(event))}
					placeholder="0"
					className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium tabular-nums outline-none placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
				{hasUnit && <span className="shrink-0 text-[13px] text-muted-foreground">{unit}</span>}
			</div>
			<p className="text-xs text-muted-foreground">{hint}</p>
		</div>
	);
}

function BudgetPanel({
	budget,
	budgetType,
	currency,
	billing,
	onBudgetChange,
	onBudgetTypeChange,
	onCurrencyChange,
	onBillingChange
}: ProjectBudgetFieldProps) {
	const t = useTranslations();
	const baseId = useId();
	const budgetTypeOptions = useBudgetTypeOptions();
	const billingOptions = useBillingOptions();
	const hasBudget = budget !== null;

	return (
		<div className="flex flex-col gap-5">
			<ChoiceCards
				name={`${baseId}-budget-type`}
				legend={t('pages.projects.modals.budget.typeLabel')}
				options={budgetTypeOptions}
				value={budgetType}
				onChange={onBudgetTypeChange}
			/>
			<AmountField
				id={`${baseId}-amount`}
				budget={budget}
				budgetType={budgetType}
				currency={currency}
				onBudgetChange={onBudgetChange}
			/>
			<div className="flex items-center justify-between gap-3">
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className={PANEL_LABEL}>{t('pages.projects.modals.budget.currencyLabel')}</span>
					<span className="text-xs text-muted-foreground/80">
						{t('pages.projects.modals.budget.currencyHint')}
					</span>
				</span>
				<CurrencyPicker currency={currency} onCurrencyChange={onCurrencyChange} />
			</div>
			<ChoiceRows
				name={`${baseId}-billing`}
				legend={t('pages.projects.modals.budget.billingLabel')}
				options={billingOptions}
				value={billing}
				onChange={onBillingChange}
			/>
			<div className="flex items-center justify-between gap-2 hairline-t border-border pt-3">
				{hasBudget && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => onBudgetChange(null)}
						className="-ml-1 text-muted-foreground"
					>
						{t('pages.projects.modals.budget.clear')}
					</Button>
				)}
				<PopoverClose render={<Button type="button" variant="outline" size="sm" className="ml-auto" />}>
					{t('pages.projects.modals.done')}
				</PopoverClose>
			</div>
		</div>
	);
}

export function ProjectBudgetField(props: ProjectBudgetFieldProps) {
	const t = useTranslations();
	const locale = useLocale();
	const billingOptions = useBillingOptions();
	const billingLabel = billingOptions.find((option) => option.value === props.billing)?.label;
	const isHours = props.budgetType === EProjectBudgetType.HOURS;
	const budgetValue = useProjectBudget({
		budget: props.budget ?? undefined,
		budgetType: props.budgetType,
		currency: props.currency
	});
	const hasBudget = Boolean(budgetValue);

	return (
		<Popover>
			<PopoverTrigger aria-label={t('pages.projects.list.COLUMN_BUDGET')} className={VALUE_BUTTON}>
				{hasBudget && budgetValue && (
					<>
						{isHours && (
							<HueIconTile hue="info" className="size-[18px] rounded-full [&_svg]:size-3">
								<Clock />
							</HueIconTile>
						)}
						{!isHours && <CurrencyGlyph symbol={currencySymbolOrPlaceholder(props.currency, locale)} />}
						<span className="font-medium tabular-nums">
							{budgetValue.amount}
							{budgetValue.unit && (
								<span className="ml-0.5 font-normal text-muted-foreground">{budgetValue.unit}</span>
							)}
						</span>
						<span className="truncate text-xs text-muted-foreground">{billingLabel}</span>
					</>
				)}
				{!hasBudget && <span className={EMPTY_VALUE}>{t('pages.projects.modals.budget.add')}</span>}
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={6}
				collisionPadding={8}
				className="max-h-[var(--available-height)] w-[22rem] max-w-[calc(100vw-1rem)] overflow-y-auto p-4"
			>
				<BudgetPanel {...props} />
			</PopoverContent>
		</Popover>
	);
}
