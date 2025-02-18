import { Button } from '@/lib/components';
import { cn } from '@/lib/utils';
import { Listbox } from '@headlessui/react';
import { CheckIcon, ChevronDown } from 'lucide-react';
import { Fragment, useState } from 'react';

export default function FinancialSettingsForm() {
	const [value, setValue] = useState<string | null>(null);

	return (
		<div className="w-full space-y-5 pt-4">
			<div className="w-full flex gap-4">
				<div className="flex-1 flex flex-col gap-5">
					<div className="flex flex-1 gap-1 flex-col">
						<label htmlFor="project_title" className=" text-xs font-medium">
							Budget Type
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setValue(data)}
								value={value}
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
						<label htmlFor="project_title" className=" text-xs font-medium">
							Budget Amount
						</label>
						<div className="w-full">
							<Select
								onChange={(data) => setValue(data)}
								value={value}
								placeholder="10 000$..."
								options={[
									{ value: 'Monthly', id: 'monthly' },
									{ value: 'Quarterly', id: 'quarterly' },
									{ value: 'Yearly', id: 'yearly' }
								]}
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
								onChange={(data) => setValue(data)}
								value={value}
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
								onChange={(data) => setValue(data)}
								value={value}
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
				<Button className=" h-[2.5rem]">Next</Button>
			</div>
		</div>
	);
}

interface ISelectProps<IItem> {
	options: IItem[];
	value: string | null;
	placeholder?: string;
	className?: string;
	onChange?: (value: string) => void;
}

export function Select<T extends { value: string | number; id: string }>(props: ISelectProps<T>) {
	const { options, placeholder, className, value, onChange } = props;

	return (
		<div className="relative">
			<Listbox value={value} onChange={onChange}>
				<Listbox.Button
					className={cn(
						'w-full border rounded-lg flex items-center justify-between text-left px-2 py-1 text-xs h-[2.2rem]',
						className
					)}
				>
					<span className={cn(!value && 'text-gray-400')}>{value ?? placeholder} </span>
					<ChevronDown size={15} className=" text-gray-400" />
				</Listbox.Button>
				<Listbox.Options
					className={cn(
						'absolute z-20 text-xs top-11 border space-y-1 w-full bg-white rounded-md p-1 shadow-md'
					)}
				>
					{options.map((item) => (
						<Listbox.Option key={item.id} value={item.id} as={Fragment}>
							{({ active, selected }) => (
								<li
									className={cn(
										'p-1 px-2 text-xs cursor-pointer rounded flex items-center gap-2',
										active ? 'bg-primary text-primary-foreground' : 'bg-white',
										value && !selected && 'pl-7'
									)}
								>
									{selected && <CheckIcon size={10} />}
									<span>{item.value}</span>
								</li>
							)}
						</Listbox.Option>
					))}
				</Listbox.Options>
			</Listbox>
		</div>
	);
}
