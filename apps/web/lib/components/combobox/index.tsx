import * as React from 'react';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { cn } from 'lib/utils';
import { Button } from '@components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';

interface ComboboxProps<T> {
	items: T[];
	itemToString: (item: T) => string;
	itemToValue: (item: T) => string;
	placeholder?: string;
	buttonWidth?: string;
	popoverWidth?: string;
	commandInputHeight?: string;
	noResultsText?: string;
	onChangeValue?: (value: T | null) => void;
	className?: string;
	popoverClassName?: string;
	selectedItem?: T | null;
	defaultValue?: string;
}

export function CustomCombobox<T>({
	items,
	itemToString,
	itemToValue,
	placeholder = 'Select item...',
	buttonWidth = 'w-[200px]',
	commandInputHeight = 'h-9',
	noResultsText = 'No item found.',
	onChangeValue,
	className,
	popoverClassName,
	selectedItem = null,
	defaultValue
}: Readonly<ComboboxProps<T>>) {
	const [open, setOpen] = React.useState(false);
	const [value, setValue] = React.useState<T | null>(selectedItem);
	const [popoverWidth, setPopoverWidth] = React.useState<number | null>(null);
	const triggerRef = React.useRef<HTMLButtonElement>(null);

	const handleSelect = (currentValue: string) => {
		const selectedItem = items.find((item) => itemToValue(item) === currentValue) || null;
		setValue(selectedItem);
		setOpen(false);
		if (onChangeValue) {
			onChangeValue(selectedItem);
		}
	};

	React.useEffect(() => {
		if (triggerRef.current) {
			setPopoverWidth(triggerRef.current.offsetWidth);
		}
	}, [triggerRef.current]);

	React.useEffect(() => {
		setValue(selectedItem);
	}, [selectedItem]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					ref={triggerRef}
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						'w-full justify-between text-left font-normal h-10 rounded-lg dark:bg-dark--theme-light',
						buttonWidth
					)}
				>
					{value ? itemToString(value) : placeholder}
					<CaretSortIcon className="w-4 h-4 ml-2 opacity-50 shrink-0" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className={cn(
					'w-full max-w-full max-h-[80vh] border border-transparent dark:bg-dark--theme-light',
					popoverClassName
				)}
				style={{ width: popoverWidth || 'auto', overflow: 'auto' }}
			>
				<Command className="dark:bg-dark--theme-light">
					<CommandInput placeholder="Search item..." className={commandInputHeight} />
					<CommandList>
						<CommandEmpty>{noResultsText}</CommandEmpty>
						<CommandGroup>
							{items.map((item) => (
								<CommandItem
									defaultValue={defaultValue}
									className="w-full dark:bg-dark--theme-light"
									key={itemToValue(item)}
									value={itemToValue(item)}
									onSelect={() => handleSelect(itemToValue(item))}
								>
									{itemToString(item)}
									<CheckIcon
										className={cn(
											'ml-auto h-4 w-4',
											value && itemToValue(value) === itemToValue(item)
												? 'opacity-100'
												: 'opacity-0'
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
