import { Button } from '@components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { cn } from 'lib/utils';
import { useEffect, useState } from 'react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import React from 'react';
import { ChevronDown } from 'lucide-react';

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
			<PopoverTrigger>
				<Button
					onClick={() => setPopoverOpen(!isPopoverOpen)}
					variant="outline"
					className={cn(
						'w-full justify-between text-left font-normal h-10 rounded-lg dark:bg-dark--theme-light',
						// !selectedItem && 'text-muted-foreground',
						triggerClassName
					)}
				>
					{selectedItem ? (
						<span className="truncate">{itemToString(selectedItem)}</span>
					) : (
						<span>Select an item</span>
					)}
					<ChevronDown className={cn('h-4 w-4 transition-transform', isPopoverOpen && 'rotate-180')} />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className={cn(
					'w-[430px] border border-transparent max-h-[80vh] dark:bg-dark--theme-light',
					popoverClassName
				)}
			>
				<div className="w-full max-h-[80vh] overflow-auto flex flex-col">
					{items.map((item: T) => {
						const key = itemId(item);
						if (renderItem) {
							const renderedItem = renderItem(item, () => onClick(item));
							return React.cloneElement(renderedItem, { key });
						}
						return (
							<span
								onClick={() => onClick(item)}
								key={key}
								className="truncate hover:cursor-pointer hover:bg-slate-50 w-full text-[13px] hover:rounded-lg p-1 hover:font-normal dark:text-white dark:hover:bg-primary"
								style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
							>
								{itemToString(item)}
							</span>
						);
					})}
				</div>
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
			<SelectTrigger className={cn('w-full', error && 'border-red-500 focus:ring-red-500')}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="z-[10000]">
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
				<p className="mt-1 text-sm text-red-500" role="alert" aria-live="polite">
					{error}
				</p>
			)}
		</Select>
	);
});
