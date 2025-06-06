import { cn } from '@/core/lib/helpers';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { ScrollArea, ScrollBar } from './scroll-bar';

interface IProps<TItem> {
	placeholder: string;
	options: TItem[];
	selectedOptions: TItem[];
	defaultOptions?: TItem[];
	onChange: (selectedValues: TItem[]) => void;
	searchEnabled?: boolean;
}

function MultiSelectWithSearchComponent<T extends { value: string | number; id: string }>(props: IProps<T>) {
	const { placeholder, options, selectedOptions, defaultOptions, onChange, searchEnabled = false } = props;

	const [searchTerm, setSearchTerm] = useState('');

	const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	}, []);

	const handleSelect = useCallback(
		(selectedOption: T) => {
			const isSelected = selectedOptions.some((el) => el.id === selectedOption.id);
			const newSelectedOptions = isSelected
				? selectedOptions.filter((el) => el.id !== selectedOption.id)
				: [...selectedOptions, selectedOption];
			onChange(newSelectedOptions);
		},
		[onChange, selectedOptions]
	);

	const filteredOptions = useMemo(
		() => options?.filter((option) => String(option.value).toLowerCase().includes(searchTerm.toLowerCase())),
		[options, searchTerm]
	);

	useEffect(() => {
		if (defaultOptions) {
			onChange(defaultOptions);
		}
	}, [defaultOptions, onChange]);

	return (
		<Popover className={'relative '}>
			<div className="flex w-full ">
				{searchEnabled && (
					<Search size={15} className="absolute z-10 -translate-y-1/2  text-slate-400 top-1/2 left-3" />
				)}
				<PopoverButton
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
								children: <div className="w-full text-xs text-left text-slate-400">{placeholder}</div>
							})}
				></PopoverButton>
				<ChevronDown size={20} className="absolute -translate-y-1/2  text-slate-400 top-1/2 right-3" />
			</div>
			<PopoverPanel className={'absolute w-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-md shadow-md'}>
				<ul className="w-full flex flex-col h-52 gap-[.125rem] p-[.125rem]">
					<ScrollArea>
						{filteredOptions?.map((option) => {
							const isSelected = selectedOptions.some((el) => el.id === option.id);

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
									<span className="overflow-hidden text-xs truncate  grow whitespace-nowrap">
										{String(option.value)}
									</span>
								</li>
							);
						})}
						<ScrollBar />
					</ScrollArea>
				</ul>
			</PopoverPanel>
		</Popover>
	);
}

export const MultiSelectWithSearch = memo(MultiSelectWithSearchComponent) as typeof MultiSelectWithSearchComponent;
