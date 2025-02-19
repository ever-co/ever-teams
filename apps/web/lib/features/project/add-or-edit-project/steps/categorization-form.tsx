import { Button } from '@/lib/components';
import { cn } from '@/lib/utils';
import { Popover } from '@headlessui/react';
import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Select } from './basic-information-form';
import { CheckIcon } from 'lucide-react';
import { IStepElementProps } from '../container';

export default function CategorizationForm(props: IStepElementProps) {
	const { goToNext } = props;
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
							multiple
							onChange={(data) => setValue(data as string[])}
							selected={value}
							placeholder="Select labels..."
							options={[
								{ value: 'Monthly', id: 'monthly' },
								{ value: 'Quarterly', id: 'quarterly' },
								{ value: 'Yearly', id: 'yearly' }
							]}
							renderItem={(item, selected) => {
								return (
									<div className="w-full h-full p-1 px-2 flex items-center gap-2">
										<span
											className={cn(
												'h-4 w-4 rounded border border-primary flex items-center justify-center',
												selected && 'bg-primary text-primary-foreground dark:text-white'
											)}
										>
											{selected && <CheckIcon size={10} />}
										</span>
										<div className="h-full flex items-center gap-1">
											<span className="w-4 h-4 rounded-full bg-red-500"></span>
											<span>{item.value}</span>
										</div>
									</div>
								);
							}}
						/>
					</div>
				</div>
				<div className="flex gap-1  flex-1 flex-col">
					<label htmlFor="project_tags" className=" text-xs font-medium">
						Tags
					</label>
					<div className="w-full">
						<Select
							multiple
							onChange={(data) => setValue(data as string[])}
							selected={value}
							placeholder="Select tags..."
							options={[
								{ value: 'Monthly', id: 'monthly' },
								{ value: 'Quarterly', id: 'quarterly' },
								{ value: 'Yearly', id: 'yearly' }
							]}
							renderItem={(item, selected) => {
								return (
									<div className="w-full h-full p-1 px-2 flex items-center gap-2">
										<span
											className={cn(
												'h-4 w-4 rounded border border-primary flex items-center justify-center',
												selected && 'bg-primary text-primary-foreground dark:text-white'
											)}
										>
											{selected && <CheckIcon size={10} />}
										</span>
										<div className="h-full flex items-center gap-1">
											<span className="w-4 h-4 rounded-full bg-red-500"></span>
											<span>{item.value}</span>
										</div>
									</div>
								);
							}}
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
				<Button onClick={goToNext} className=" h-[2.5rem]">
					Next
				</Button>
			</div>
		</div>
	);
}
