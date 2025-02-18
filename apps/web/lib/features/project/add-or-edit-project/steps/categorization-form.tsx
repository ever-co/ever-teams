import { Button } from '@/lib/components';
import { cn } from '@/lib/utils';
import { Listbox, Popover } from '@headlessui/react';
import { CheckIcon, ChevronDown } from 'lucide-react';
import { Fragment, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

export default function CategorizationForm() {
	const [value, setValue] = useState<string[]>([]);

	return (
		<div className="w-full space-y-5 pt-4">
			<div className="w-full flex gap-3">
				<div className="flex flex-1 gap-1 flex-col">
					<label htmlFor="project_labels" className=" text-xs font-medium">
						Labels
					</label>
					<div className="w-full">
						<Select
							onChange={(data) => setValue(data)}
							value={value}
							placeholder="Select labels..."
							options={[
								{ value: 'Monthly', id: 'monthly' },
								{ value: 'Quarterly', id: 'quarterly' },
								{ value: 'Yearly', id: 'yearly' }
							]}
						/>
					</div>
				</div>
				<div className="flex gap-1  flex-1 flex-col">
					<label htmlFor="project_tags" className=" text-xs font-medium">
						Tags
					</label>
					<div className="w-full">
						<Select
							onChange={(data) => setValue(data)}
							value={value}
							placeholder="Select tags..."
							options={[
								{ value: 'Monthly', id: 'monthly' },
								{ value: 'Quarterly', id: 'quarterly' },
								{ value: 'Yearly', id: 'yearly' }
							]}
						/>
					</div>
				</div>
				<div className="flex gap-1 flex-1 flex-col">
					<label htmlFor="project_color" className=" text-xs font-medium">
						Color Code
					</label>
					<div className="w-full">
						<Popover className={cn('relative w-full')}>
							<Popover.Button className={cn('w-full')}>
								<div className="flex w-full items-center gap-1 dark:bg-dark--theme-light rounded-lg cursor-pointer h-[2.2rem]">
									<div className="h-full w-[2.2rem] rounded-lg" style={{ backgroundColor: '#000' }} />
									<span className=" border h-full grow flex items-center px-3 uppercase rounded-lg">
										#e9b945
									</span>
								</div>
							</Popover.Button>
							<Popover.Panel className="w-fit absolute top-11 border rounded-md shadow-md dark:bg-dark--theme-light input-border">
								<HexColorPicker />
							</Popover.Panel>
						</Popover>
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
	value: string[];
	placeholder?: string;
	className?: string;
	onChange?: (value: string[]) => void;
}

export function Select<T extends { value: string | number; id: string }>(props: ISelectProps<T>) {
	const { options, placeholder, className, value, onChange } = props;

	return (
		<div className="relative">
			<Listbox multiple value={value} onChange={onChange}>
				<Listbox.Button
					className={cn(
						'w-full border rounded-lg flex items-center justify-between text-left px-2 py-1 text-xs h-[2.2rem]',
						className
					)}
				>
					<span className={cn(!value.length && 'text-gray-400')}>{placeholder} </span>
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
										active ? 'bg-primary/5' : 'bg-white'
									)}
								>
									<span
										className={cn(
											'h-4 w-4 rounded border border-primary flex items-center justify-center',
											selected && 'bg-primary text-primary-foreground'
										)}
									>
										{selected && <CheckIcon size={10} />}
									</span>

									<div className="flex items-center gap-1">
										<span className="w-4 h-4 rounded-full border"></span>
										<span>{item.value}</span>
									</div>
								</li>
							)}
						</Listbox.Option>
					))}
				</Listbox.Options>
			</Listbox>
		</div>
	);
}
