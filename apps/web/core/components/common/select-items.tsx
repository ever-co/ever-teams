import { Button } from '@/core/components/duplicated-components/_button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { cn } from '@/core/lib/helpers';
import { useEffect, useState } from 'react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import React from 'react';
import { ChevronDown } from '@/core/components/icons';

interface SelectItemsProps<T> {
	items: T[];
	onValueChange?: (value: T) => void;
	itemToString: (item: T) => string;
	itemId: (item: T) => string;
	triggerClassName?: string;
	popoverClassName?: string;
	renderItem?: (item: T, onClick: () => void) => React.ReactElement;
	defaultValue?: T;
}

export function SelectItems<T>({
	items,
	onValueChange,
	itemToString,
	itemId,
	triggerClassName = '',
	popoverClassName = '',
	renderItem,
	defaultValue
}: SelectItemsProps<T>) {
	const [selectedItem, setSelectedItem] = useState<T | null>(null);
	const [isPopoverOpen, setPopoverOpen] = useState(false);

	const onClick = (item: T) => {
		setSelectedItem(item);
		setPopoverOpen(false);
		if (onValueChange) {
			onValueChange(item as T);
		}
	};

	useEffect(() => {
		if (defaultValue) {
			setSelectedItem(defaultValue);
			if (onValueChange) {
				onValueChange(defaultValue);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultValue]);

	return (
		<Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
			<PopoverTrigger asChild>
				<Button
					onClick={() => setPopoverOpen(!isPopoverOpen)}
					variant="outline"
					size="lg"
					className={cn(
						'w-full justify-between px-3 text-left font-normal',
						// !selectedItem && 'text-muted-foreground',
						triggerClassName
					)}
				>
					{selectedItem ? (
						<span className="truncate">{itemToString(selectedItem)}</span>
					) : (
						<span>Select an item</span>
					)}
					<ChevronDown
						className={cn(
							'size-4 shrink-0 text-muted-foreground transition-transform',
							isPopoverOpen && 'rotate-180'
						)}
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent className={cn('w-[430px] max-h-[80vh] p-1', popoverClassName)}>
				<ul className="w-full max-h-[80vh] overflow-auto flex flex-col gap-0.5">
					{items.map((item: T) => {
						const key = itemId(item);
						if (renderItem) {
							const renderedItem = renderItem(item, () => onClick(item));
							return React.cloneElement(renderedItem, { key });
						}
						return (
							<li
								onClick={() => onClick(item)}
								key={key}
								className="truncate hover:cursor-pointer hover:bg-foreground/5 w-full text-sm rounded-md px-2 py-1.5 transition-colors whitespace-nowrap text-ellipsis overflow-hidden"
							>
								{itemToString(item)}
							</li>
						);
					})}
				</ul>
			</PopoverContent>
		</Popover>
	);
}

type DynamicSelectProps<T> = {
	items: T[];
	label: string;
	placeholder: string;
	getItemLabel: (item: T) => string;
	getItemValue: (item: T) => string;
	onChange?: (value: string) => void;
	disabled?: boolean;
	error?: string;
	defaultValue?: string;
};

export const DynamicSelect = React.memo(function DynamicSelect<T>({
	items,
	label,
	placeholder,
	getItemLabel,
	getItemValue,
	onChange,
	disabled,
	error,
	defaultValue
}: DynamicSelectProps<T>) {
	return (
		<Select onValueChange={onChange} disabled={disabled} defaultValue={defaultValue}>
			<SelectTrigger className={cn('w-full', error && 'border-destructive focus-visible:ring-destructive/20')}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="z-[1001]">
				<SelectGroup>
					<SelectLabel>{label}</SelectLabel>
					{items.map((item) => (
						<SelectItem key={getItemValue(item)} value={getItemValue(item)}>
							{getItemLabel(item)}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
			{error && (
				<p className="mt-1 text-sm text-destructive-ink" role="alert" aria-live="polite">
					{error}
				</p>
			)}
		</Select>
	);
});
