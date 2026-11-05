import { cn } from '@/core/lib/helpers';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check, ChevronDown, Search } from '@/core/components/icons';
import { controlRecipe } from '@/core/components/common/input';
import { popoverSurfaceRecipe } from '@/core/components/common/popover';
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
					<Search className="size-4 text-muted-foreground z-10 absolute top-1/2 -translate-y-1/2 left-3" />
				)}
				<PopoverButton
					className={cn(
						controlRecipe,
						'relative grow h-9 px-3 py-1 pr-9 text-left text-sm',
						searchEnabled && 'pl-9'
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
								children: (
									<div className="w-full text-sm text-muted-foreground/75 text-left">
										{placeholder}
									</div>
								)
							})}
				></PopoverButton>
				<ChevronDown className="size-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 right-3" />
			</div>
			<PopoverPanel className={cn('absolute w-full mt-1 z-20', popoverSurfaceRecipe)}>
				<ul className="w-full flex flex-col h-52 gap-0.5 p-1">
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
											'w-full cursor-pointer flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-foreground/5',
											isSelected && 'bg-foreground/5 font-medium'
										)}
									>
										<Check
											className={cn(
												selectedOptions.length > 0 ? 'block' : 'hidden',
												isSelected ? ' opacity-100' : ' opacity-0'
											)}
											size={15}
										/>
										<span className="text-sm grow truncate overflow-hidden whitespace-nowrap">
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
