import { Button, InputField } from '@/lib/components';
import { FormEvent, useEffect, useState } from 'react';
import { Select } from './basic-information-form';
import { IStepElementProps } from '../container';
import { OrganizationProjectBudgetTypeEnum, ProjectBillingEnum } from '@/app/interfaces';
import { useTranslations } from 'next-intl';
import { useCurrencies } from '@/app/hooks/features/useCurrencies';

export default function FinancialSettingsForm(props: IStepElementProps) {
	const { goToNext } = props;
	const [currency, setCurrency] = useState<string>();
	const [billingType, setBillingType] = useState<ProjectBillingEnum>(ProjectBillingEnum.FLAT_FEE);
	const [budgetType, setBudgetType] = useState<OrganizationProjectBudgetTypeEnum>(
		OrganizationProjectBudgetTypeEnum.HOURS
	);
	const [budgetAmount, setBudgetAmount] = useState<number>();
	const budgetTypes = Object.values(OrganizationProjectBudgetTypeEnum).map((value) => ({
		id: value,
		value: value
	}));
	const billingTypes = Object.values(ProjectBillingEnum).map((value) => ({
		id: value,
		value: value
	}));
	const t = useTranslations();
	const { currencies, getCurrencies } = useCurrencies();

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		goToNext({
			currency: currencies.find((el) => el.id === currency)?.isoCode,
			budget: budgetAmount,
			budgetType,
			billing: billingType
		});
	};

	useEffect(() => {
		getCurrencies();
	}, [getCurrencies]);

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
									id: currency.id,
									value: `${currency.isoCode} - ${currency.currency}`
								}))}
								searchEnabled
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
			<div className="w-full flex items-center justify-end">
				<Button type="submit" className=" h-[2.5rem]">
					{t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}
