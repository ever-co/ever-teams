import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@components/ui/scroll-bar';
import { Popover } from '@headlessui/react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

interface IProps<TItem> {
	placeholder: string;
	options: TItem[];
	selectedOptions: TItem[];
	defaultOptions?: TItem[];
	onChange: (selectedValues: TItem[]) => void;
	searchEnabled?: boolean;
}

export function MultiSelectWithSearch<T extends { value: string | number; id: string }>(props: IProps<T>) {
	const { placeholder, options, selectedOptions, defaultOptions, onChange, searchEnabled = false } = props;

	const [searchTerm, setSearchTerm] = useState('');

	const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	}, []);

	const handleSelect = useCallback(
		(selectedOption: T) => {
			let newSelectedOptions = selectedOptions;

			if (!selectedOptions.map((el) => el.value).includes(selectedOption.value)) {
				newSelectedOptions.push(selectedOption);
			} else {
				newSelectedOptions = newSelectedOptions.filter((el) => el.id !== selectedOption.id);
			}
			onChange(newSelectedOptions);
		},
		[onChange, selectedOptions]
	);

	useEffect(() => {
		if (defaultOptions) {
			onChange(defaultOptions);
		}
	}, [defaultOptions, onChange]);

	return (
		<Popover className={'relative '}>
			<div className="w-full flex ">
				{searchEnabled && (
					<Search size={15} className=" text-slate-400 z-10 absolute top-1/2 -translate-y-1/2 left-3" />
				)}
				<Popover.Button
					className={cn(
						'border relative grow rounded-lg w-full bg-transparent text-xs px-3 py-2',
						searchEnabled && ' pl-9'
					)}
					{...(searchEnabled
						? {
								placeholder: placeholder,
								as: 'input',
								type: 'text',
								onChange: handleSearchChange,
								value: searchTerm
							}
						: {
								as: 'button',
								children: <div className="w-full text-xs text-slate-400 text-left">{placeholder}</div>
							})}
				></Popover.Button>
				<ChevronDown size={20} className=" text-slate-400  absolute top-1/2 -translate-y-1/2 right-3" />
			</div>
			<Popover.Panel className={'absolute w-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-md shadow-md'}>
				<ul className="w-full flex flex-col h-52 gap-[.125rem] p-[.125rem]">
					<ScrollArea>
						{options
							?.filter((option) => String(option.value).toLowerCase().includes(searchTerm.toLowerCase()))
							?.map((option) => {
								const isSelected = selectedOptions.map((el) => el.value).includes(option.value);

								return (
									<li
										onClick={() => handleSelect(option)}
										key={option.id}
										className={cn(
											'w-full  cursor-pointer flex gap-2  px-4 py-2 rounded-sm text-sm',
											isSelected ? 'bg-primary text-white' : 'hover:bg-primary/10'
										)}
									>
										<Check
											className={cn(
												selectedOptions.length > 0 ? 'block' : 'hidden',
												isSelected ? ' opacity-100' : ' opacity-0'
											)}
											size={15}
										/>
										<span className=" text-xs grow truncate overflow-hidden whitespace-nowrap ">
											{String(option.value)}
										</span>
									</li>
								);
							})}

						<ScrollBar />
					</ScrollArea>
				</ul>
			</Popover.Panel>
		</Popover>
	);
}
