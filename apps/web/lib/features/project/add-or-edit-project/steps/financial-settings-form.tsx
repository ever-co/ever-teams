import { Button, InputField } from '@/lib/components';
import { useState } from 'react';
import { Select } from './basic-information-form';
import { IStepElementProps } from '../container';

export default function FinancialSettingsForm(props: IStepElementProps) {
	const { goToNext } = props;
	const [value, setValue] = useState<string | null>(null);

	return (
		<div className="w-full space-y-5 pt-4">
			<div className="w-full flex gap-4">
				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-1 gap-1 flex-col">
						<label className=" text-xs font-medium">Budget Type</label>
						<div className="w-full">
							<Select
								onChange={(data) => setValue(data as string)}
								selected={value}
								placeholder="Select a budget type"
								options={[
									{ value: 'Monthly', id: 'monthly' },
									{ value: 'Quarterly', id: 'quarterly' },
									{ value: 'Yearly', id: 'yearly' }
								]}
							/>
						</div>
					</div>
					<div className="flex gap-1 flex-col">
						<label htmlFor="budget_amout" className=" text-xs font-medium">
							Budget Amount
						</label>
						<div className="w-full">
							<InputField
								type="number"
								id="budget_amout"
								placeholder="10 000$..."
								className=" text-xs border dark:border-white   h-[2.2rem] px-4 rounded-lg bg-transparent dark:bg-transparent"
								noWrapper
							/>
						</div>
					</div>
				</div>

				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-1 gap-1 flex-col">
						<label htmlFor="project_title" className=" text-xs font-medium">
							Currency Selection
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setValue(data as string)}
								selected={value}
								placeholder="Select a currency..."
								options={[
									{ value: 'Monthly', id: 'monthly' },
									{ value: 'Quarterly', id: 'quarterly' },
									{ value: 'Yearly', id: 'yearly' }
								]}
							/>
						</div>
					</div>
					<div className="flex gap-1 flex-col">
						<label htmlFor="project_title" className=" text-xs font-medium">
							Billing Configuration
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setValue(data as string)}
								selected={value}
								placeholder="Select interval..."
								options={[
									{ value: 'Monthly', id: 'monthly' },
									{ value: 'Quarterly', id: 'quarterly' },
									{ value: 'Yearly', id: 'yearly' }
								]}
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
