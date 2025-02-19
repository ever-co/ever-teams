import { Button, InputField } from '@/lib/components';
import RichTextEditor from '../text-editor';
import { Calendar } from '@components/ui/calendar';
import { Listbox, Popover } from '@headlessui/react';
import { cn } from '@/lib/utils';
import { CalendarIcon, CheckIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Fragment } from 'react';

export default function BasicInformationForm() {
	return (
		<div className="w-full space-y-5 pt-4">
			<div className="flex w-full gap-1 flex-col">
				<label htmlFor="project_title" className=" text-xs font-medium">
					Project Title
				</label>
				<div className="w-full ">
					<InputField
						id="project_title"
						placeholder="Client Project #1..."
						className=" text-xs border dark:border-white   h-[2.2rem] px-4 rounded-lg bg-transparent dark:bg-transparent"
						noWrapper
					/>
				</div>
			</div>
			<div className="w-full">
				<RichTextEditor />
			</div>
			<div className="w-full flex gap-2">
				<div className="flex w-full gap-1 flex-col">
					<label htmlFor="project_start_date" className="text-xs font-medium">
						Start Date
					</label>
					<DatePicker id="project_start_date" placeholder="Pick a date" />
				</div>
				<div className="flex w-full gap-1 flex-col">
					<label htmlFor="project_end_date" className="text-xs font-medium">
						End Date
					</label>
					<DatePicker id="project_end_date" placeholder="Pick a date" />
				</div>
			</div>
			<div className="flex w-full gap-1 flex-col">
				<label htmlFor="website_url" className=" text-xs font-medium">
					Website URL
				</label>
				<div className="w-full ">
					<InputField
						id="website_url"
						placeholder="https://example.com"
						className=" text-xs border dark:border-white   h-[2.2rem] px-4 rounded-lg bg-transparent dark:bg-transparent"
						noWrapper
					/>
				</div>
			</div>

			<div className="flex w-full gap-1 flex-col">
				<span className=" text-xs font-medium">Project Thumbnail</span>
				<label
					htmlFor="dropzone-file"
					className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
				>
					<div className="flex items-center gap-3 justify-center">
						<svg
							className="w-6 h-6 text-gray-500 dark:text-gray-400"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 20 16"
						>
							<path
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="1"
								d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
							/>
						</svg>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							<span className=" text-xs">Upload photo</span>
						</p>
					</div>
					<input id="dropzone-file" type="file" className="hidden" />
				</label>
			</div>
			<div className="w-full flex items-center justify-end">
				<Button className=" h-[2.5rem]">Next</Button>
			</div>
		</div>
	);
}

/**
 * ----------------------------------------------------------------
 * Some common components for the project creation flow.
 * ----------------------------------------------------------------
 */

/**
 * Date picker
 */

interface IDatePickerProps {
	className?: string;
	onChange?: (date?: Date) => void;
	value?: Date;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	id?: string;
}
export function DatePicker(props: IDatePickerProps) {
	const { className, onChange, value, placeholder, disabled, required, id } = props;

	return (
		<Popover className={cn('relative w-full border rounded-lg p-2')}>
			<Popover.Button
				className={cn(
					'w-full flex items-center justify-between text-left',
					!value && 'text-muted-foreground',
					className
				)}
			>
				{value ? format(value, 'PPP') : <span className=" text-xs">{placeholder}</span>}
				<CalendarIcon size={15} />
			</Popover.Button>
			<Popover.Panel className="w-auto border  rounded-lg bg-white shadow-md absolute right-0 top-11 p-0">
				<Calendar
					id={id}
					required={required}
					disabled={disabled}
					mode="single"
					selected={value}
					onSelect={onChange}
					initialFocus
				/>
			</Popover.Panel>
		</Popover>
	);
}

/**
 * Select (mono / multi)
 */

interface ISelectProps<IItem> {
	options: IItem[];
	selected: string | string[] | null;
	placeholder?: string;
	className?: string;
	onChange?: (value: string | string[]) => void;
	multiple?: boolean;
	renderItem?: (item: IItem, selected: boolean, active: boolean) => React.ReactNode;
}

export function Select<T extends { value: string | number; id: string }>(props: ISelectProps<T>) {
	const { options, placeholder, className, selected, onChange, renderItem, multiple } = props;

	const isMulti = multiple ?? false;

	return (
		<div className="relative">
			<Listbox multiple={isMulti} value={selected} onChange={onChange}>
				<Listbox.Button
					className={cn(
						'w-full border rounded-lg flex items-center justify-between text-left px-2 py-1 text-xs h-[2.2rem]',
						className
					)}
				>
					<span className={cn(!selected?.length && 'text-gray-400')}>
						{isMulti ? placeholder : options.find((el) => el.id == selected)?.value || placeholder}
					</span>
					<ChevronDown size={15} className=" text-gray-400" />
				</Listbox.Button>
				<Listbox.Options
					className={cn(
						'absolute z-20 text-xs top-11 border space-y-1 w-full bg-white rounded-md p-1 shadow-md'
					)}
				>
					{options.map((item) => (
						<Listbox.Option key={item.id} value={item.id} as={Fragment}>
							{({ active, selected: isSelected }) => (
								<li className={cn('text-xs cursor-pointer rounded ')}>
									{renderItem ? (
										renderItem(item, isSelected, active)
									) : isMulti ? (
										// Default multi-select render
										<div className="w-full h-full p-1 px-2 flex items-center gap-2">
											<span
												className={cn(
													'h-4 w-4 rounded border border-primary flex items-center justify-center',
													isSelected && 'bg-primary text-primary-foreground'
												)}
											>
												{isSelected && <CheckIcon size={10} />}
											</span>
											<span>{item.value}</span>
										</div>
									) : (
										// Default single-select render
										<div
											className={cn(
												'w-full h-full p-1 px-2 flex items-center gap-2 rounded',
												isSelected && 'bg-primary text-primary-foreground'
											)}
										>
											{isSelected && <CheckIcon size={10} />}
											<span className={cn(selected && !isSelected && 'pl-5')}>{item.value}</span>
										</div>
									)}
								</li>
							)}
						</Listbox.Option>
					))}
				</Listbox.Options>
			</Listbox>
		</div>
	);
}
