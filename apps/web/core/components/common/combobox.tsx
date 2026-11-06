import * as React from 'react';
import { Check, ChevronsUpDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/core/components/common/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';

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
					size="lg"
					role="combobox"
					aria-expanded={open}
					className={cn('w-full justify-between px-3 text-left font-normal', buttonWidth)}
				>
					{value ? itemToString(value) : placeholder}
					<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className={cn('w-full max-w-full max-h-[80vh] p-0', popoverClassName)}
				style={{ width: popoverWidth || 'auto', overflow: 'auto' }}
			>
				<Command>
					<CommandInput placeholder="Search item..." className={commandInputHeight} />
					<CommandList>
						<CommandEmpty>{noResultsText}</CommandEmpty>
						<CommandGroup>
							{items.map((item) => (
								<CommandItem
									defaultValue={defaultValue}
									className="w-full"
									key={itemToValue(item)}
									value={itemToValue(item)}
									onSelect={() => handleSelect(itemToValue(item))}
								>
									{itemToString(item)}
									<Check
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
