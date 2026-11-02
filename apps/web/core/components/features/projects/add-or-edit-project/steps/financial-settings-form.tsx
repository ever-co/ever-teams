import {
	Button,
	modalFieldLabelClass,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components';
import { FormEvent, useCallback, useState } from 'react';
import { Select } from './basic-information-form';
import { IStepElementProps } from '../container';
import { EProjectBudgetType, EProjectBilling } from '@/core/types/generics/enums/project';
import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { InputField } from '@/core/components/duplicated-components/_input';
import { getInitialValue } from '@/core/lib/helpers/create-project';
import { ECurrencies } from '@/core/types/generics/enums/currency';
import { useCurrenciesOwner } from '@/core/hooks/bootstrap/use-feature-data';

export default function FinancialSettingsForm(props: IStepElementProps) {
	const { goToNext, goToPrevious, currentData } = props;
	const { currencies } = useCurrenciesOwner();
	const [currency, setCurrency] = useState<string>(() => getInitialValue(currentData, 'currency', undefined));
	const [billingType, setBillingType] = useState<EProjectBilling>(() =>
		getInitialValue(currentData, 'billing', EProjectBilling.FLAT_FEE)
	);
	const [budgetType, setBudgetType] = useState<EProjectBudgetType>(() =>
		getInitialValue(currentData, 'budgetType', EProjectBudgetType.HOURS)
	);
	const [budgetAmount, setBudgetAmount] = useState<number>(() => getInitialValue(currentData, 'budget', undefined));
	const budgetTypes = Object.values(EProjectBudgetType).map((value) => ({
		id: value,
		value: value
	}));
	const billingTypes = Object.values(EProjectBilling).map((value) => ({
		id: value,
		value: value
	}));
	const t = useTranslations();

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		goToNext?.({
			currency: currency as ECurrencies,
			budget: budgetAmount,
			budgetType,
			billing: billingType
		});
	};

	const handlePrevious = useCallback(() => {
		goToPrevious?.({
			currency: currency as ECurrencies,
			budget: budgetAmount,
			budgetType,
			billing: billingType
		});
	}, [billingType, budgetAmount, budgetType, currency, goToPrevious]);

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-5 pt-4">
			<div className="w-full flex gap-4">
				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-col flex-1 gap-2">
						<label className={modalFieldLabelClass}>
							{t('pages.projects.financialSettingsForm.formFields.budgetType')}
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setBudgetType(data as EProjectBudgetType)}
								selected={budgetType as string}
								placeholder={t('pages.projects.financialSettingsForm.formFields.budgetTypePlaceholder')}
								options={budgetTypes}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<label htmlFor="budget_amount" className={modalFieldLabelClass}>
							{t('pages.projects.financialSettingsForm.formFields.budgetAmount')}
						</label>
						<div className="w-full">
							<InputField
								type="number"
								value={budgetAmount}
								onChange={(e) => setBudgetAmount(parseFloat(e.target.value))}
								id="budget_amount"
								placeholder={t(
									'pages.projects.financialSettingsForm.formFields.budgetAmountPlaceholder'
								)}
								noWrapper
							/>
						</div>
					</div>
				</div>

				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-col flex-1 gap-2">
						<label className={modalFieldLabelClass}>
							{t('pages.projects.financialSettingsForm.formFields.currency')}
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setCurrency(data as string)}
								selected={currency ?? null}
								placeholder={t('pages.projects.financialSettingsForm.formFields.currencyPlaceholder')}
								options={currencies.map((currency) => ({
									id: currency.isoCode,
									value: `${currency.isoCode} - ${currency.currency}`
								}))}
								searchEnabled
								renderValue={() => (
									<span className={cn('capitalize', !currency?.length && 'text-muted-foreground/75')}>
										{currency
											? `${currency}`
											: t('pages.projects.financialSettingsForm.formFields.currencyPlaceholder')}
									</span>
								)}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<label htmlFor="project_title" className={modalFieldLabelClass}>
							{t('pages.projects.financialSettingsForm.formFields.billing')}
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setBillingType(data as EProjectBilling)}
								selected={billingType as string}
								placeholder={t('pages.projects.financialSettingsForm.formFields.billingPlaceholder')}
								options={billingTypes}
							/>
						</div>
					</div>
				</div>
			</div>
			<div className={cn(modalFooterClass, 'hairline-t border-border pt-4')}>
				<Button
					onClick={handlePrevious}
					variant="ghost"
					size="default"
					className={modalSecondaryActionClass}
					type="button"
				>
					{t('common.BACK')}
				</Button>
				<Button type="submit" size="default" className={modalPrimaryActionClass}>
					{t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}
