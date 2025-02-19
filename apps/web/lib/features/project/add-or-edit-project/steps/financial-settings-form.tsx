import { Button, InputField } from '@/lib/components';
import { useState } from 'react';
import { Select } from './basic-information-form';
import { IStepElementProps } from '../container';

const budgetTypeDataSource = [
	{ id: 'cost-based', value: 'Cost-based' },
	{ id: 'hours-based', value: 'Hours-based' }
];

const currencyDataSource = [
	{ id: 'USD', value: 'USD' },
	{ id: 'EUR', value: 'EUR' },
	{ id: 'GBP', value: 'GBP' }
];

const billingTypeDataSource = [
	{ value: 'Monthly', id: 'monthly' },
	{ value: 'Quarterly', id: 'quarterly' },
	{ value: 'Yearly', id: 'yearly' }
];

export default function FinancialSettingsForm(props: IStepElementProps) {
	const { goToNext } = props;
	const [currency, setCurrency] = useState<string | null>(null);
	const [billingType, setBillingType] = useState<string | null>(null);
	const [budgetType, setBudgetType] = useState<string | null>(null);
	const [budgetAmount, setBudgetAmount] = useState<number>();

	return (
		<div className="w-full space-y-5 pt-4">
			<div className="w-full flex gap-4">
				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-1 gap-1 flex-col">
						<label className=" text-xs font-medium">Budget Type</label>
						<div className="w-full">
							<Select
								onChange={(data) => setBudgetType(data as string)}
								selected={budgetType}
								placeholder="Select a budget type"
								options={budgetTypeDataSource}
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
								onChange={(data) => setCurrency(data as string)}
								selected={currency}
								placeholder="Select a currency..."
								options={currencyDataSource}
							/>
						</div>
					</div>
					<div className="flex gap-1 flex-col">
						<label htmlFor="project_title" className=" text-xs font-medium">
							Billing Configuration
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setBillingType(data as string)}
								selected={billingType}
								placeholder="Select interval..."
								options={billingTypeDataSource}
							/>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-end">
				<Button onClick={goToNext} className=" h-[2.5rem]">
					Next
				</Button>
			</div>
		</div>
	);
}
