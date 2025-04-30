import { Button, InputField } from '@/core/components';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Select } from './basic-information-form';
import { IStepElementProps } from '../container';
import { OrganizationProjectBudgetTypeEnum, ProjectBillingEnum } from '@/app/interfaces';
import { useTranslations } from 'next-intl';
import { useCurrencies } from '@/core/hooks/features/useCurrencies';
import { getInitialValue } from '../utils';
import { cn } from '@/core/lib/helpers';

export default function FinancialSettingsForm(props: IStepElementProps) {
	const { goToNext, goToPrevious, currentData } = props;
	const { currencies, getCurrencies } = useCurrencies();
	const [currency, setCurrency] = useState<string>(() => getInitialValue(currentData, 'currency', undefined));
	const [billingType, setBillingType] = useState<ProjectBillingEnum>(() =>
		getInitialValue(currentData, 'billing', ProjectBillingEnum.FLAT_FEE)
	);
	const [budgetType, setBudgetType] = useState<OrganizationProjectBudgetTypeEnum>(() =>
		getInitialValue(currentData, 'budgetType', OrganizationProjectBudgetTypeEnum.HOURS)
	);
	const [budgetAmount, setBudgetAmount] = useState<number>(() => getInitialValue(currentData, 'budget', undefined));
	const budgetTypes = Object.values(OrganizationProjectBudgetTypeEnum).map((value) => ({
		id: value,
		value: value
	}));
	const billingTypes = Object.values(ProjectBillingEnum).map((value) => ({
		id: value,
		value: value
	}));
	const t = useTranslations();

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		goToNext({
			currency: currencies.find((el) => el.isoCode === currency)?.isoCode,
			budget: budgetAmount,
			budgetType,
			billing: billingType
		});
	};

	useEffect(() => {
		getCurrencies();
	}, [getCurrencies]);

	const handlePrevious = useCallback(() => {
		goToPrevious({
			currency: currencies.find((el) => el.isoCode === currency)?.isoCode,
			budget: budgetAmount,
			budgetType,
			billing: billingType
		});
	}, [billingType, budgetAmount, budgetType, currencies, currency, goToPrevious]);

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-5 pt-4">
			<div className="w-full flex gap-4">
				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-1 gap-1 flex-col">
						<label className=" text-xs font-medium">
							{t('pages.projects.financialSettingsForm.formFields.budgetType')}
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setBudgetType(data as OrganizationProjectBudgetTypeEnum)}
								selected={budgetType as string}
								placeholder={t('pages.projects.financialSettingsForm.formFields.budgetTypePlaceholder')}
								options={budgetTypes}
							/>
						</div>
					</div>
					<div className="flex gap-1 flex-col">
						<label htmlFor="budget_amount" className=" text-xs font-medium">
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
								className=" text-xs border dark:border-white   h-[2.2rem] px-4 rounded-lg bg-transparent dark:bg-transparent"
								noWrapper
							/>
						</div>
					</div>
				</div>

				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-1 gap-1 flex-col">
						<label className=" text-xs font-medium">
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
									<span className={cn(' capitalize', !currency?.length && 'text-gray-400')}>
										{currency
											? `${currency}`
											: t('pages.projects.financialSettingsForm.formFields.currencyPlaceholder')}
									</span>
								)}
							/>
						</div>
					</div>
					<div className="flex gap-1 flex-col">
						<label htmlFor="project_title" className=" text-xs font-medium">
							{t('pages.projects.financialSettingsForm.formFields.billing')}
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setBillingType(data as ProjectBillingEnum)}
								selected={billingType as string}
								placeholder={t('pages.projects.financialSettingsForm.formFields.billingPlaceholder')}
								options={billingTypes}
							/>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-between">
				<Button onClick={handlePrevious} className=" h-[2.5rem]" type="button">
					{t('common.BACK')}
				</Button>
				<Button type="submit" className=" h-[2.5rem]">
					{t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}
