import { Button, InputField } from '@/lib/components';
import { FormEvent, useState } from 'react';
import { Select } from './basic-information-form';
import { IStepElementProps } from '../container';
import { OrganizationProjectBudgetTypeEnum, ProjectBillingEnum } from '@/app/interfaces';
import { CurrencyEnum } from '@/app/constants';

export default function FinancialSettingsForm(props: IStepElementProps) {
	const { goToNext } = props;
	const [currency, setCurrency] = useState<CurrencyEnum>(CurrencyEnum.USD);
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

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		goToNext({
			currency,
			budget: budgetAmount,
			budgetType,
			billing: billingType
		});
	};

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-5 pt-4">
			<div className="w-full flex gap-4">
				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-1 gap-1 flex-col">
						<label className=" text-xs font-medium">Budget Type</label>
						<div className="w-full">
							<Select
								onChange={(data) => setBudgetType(data as OrganizationProjectBudgetTypeEnum)}
								selected={budgetType as string}
								placeholder="Select a budget type"
								options={budgetTypes}
							/>
						</div>
					</div>
					<div className="flex gap-1 flex-col">
						<label htmlFor="budget_amount" className=" text-xs font-medium">
							Budget Amount
						</label>
						<div className="w-full">
							<InputField
								type="number"
								value={budgetAmount}
								onChange={(e) => setBudgetAmount(parseFloat(e.target.value))}
								id="budget_amount"
								placeholder="10 000$..."
								className=" text-xs border dark:border-white   h-[2.2rem] px-4 rounded-lg bg-transparent dark:bg-transparent"
								noWrapper
							/>
						</div>
					</div>
				</div>

				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-1 gap-1 flex-col">
						<label className=" text-xs font-medium">Currency Selection</label>
						<div className="w-full">
							<Select
								onChange={(data) => setCurrency(data as CurrencyEnum)}
								selected={currency ?? null}
								placeholder="Select a currency..."
								options={Object.keys(CurrencyEnum).map((currency) => ({
									id: currency,
									value: currency
								}))}
							/>
						</div>
					</div>
					<div className="flex gap-1 flex-col">
						<label htmlFor="project_title" className=" text-xs font-medium">
							Billing Configuration
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setBillingType(data as ProjectBillingEnum)}
								selected={billingType as string}
								placeholder="Select interval..."
								options={billingTypes}
							/>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-end">
				<Button type="submit" className=" h-[2.5rem]">
					Next
				</Button>
			</div>
		</form>
	);
}
