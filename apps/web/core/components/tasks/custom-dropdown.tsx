import { cn } from '@/core/lib/helpers';
import { useState, ReactNode } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../common/dropdown-menu';

// A complete dropdown component that mimics Listbox functionality
export function CustomListboxDropdown<T>({
	value,
	values = [],
	onChange,
	disabled,
	enabled = true,
	trigger,
	items,
	renderItem,
	multiple = false,
	className,
	dropdownClassName,
	children
}: {
	value?: T;
	values?: T[];
	onChange?: (value: T | T[]) => void;
	disabled?: boolean;
	enabled?: boolean;
	trigger: ReactNode;
	items: Array<{ value?: T; name?: string; [key: string]: any }>;
	renderItem: (item: { value?: T; name?: string; [key: string]: any }, isSelected: boolean) => ReactNode;
	multiple?: boolean;
	className?: string;
	dropdownClassName?: string;
	children?: ReactNode;
}) {
	const [open, setOpen] = useState(false);

	const handleSelect = (itemValue: T) => {
		if (!onChange) return;
		if (multiple) {
			const stringItemValue = String(itemValue);
			const isAlreadySelected = values.some((v) => String(v) === stringItemValue);
			if (isAlreadySelected) {
				const newValues = values.filter((v) => String(v) !== stringItemValue);
				onChange(newValues);
			} else {
				const stringValues = values.map((v) => String(v));

				if (!stringValues.includes(stringItemValue)) {
					onChange([...values, itemValue]);
				} else {
					console.log('Value already selected, ignored:', stringItemValue);
				}
			}
		} else {
			onChange(itemValue);
			setOpen(false);
		}
	};

	return (
		<div className={cn('relative', className)}>
			<DropdownMenu open={open && enabled} onOpenChange={enabled ? setOpen : undefined}>
				<DropdownMenuTrigger asChild disabled={disabled || !enabled}>
					<div className="cursor-pointer outline-none">{trigger}</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className={cn(
						'animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
						'max-h-[320px] overflow-auto scrollbar-hide',
						dropdownClassName
					)}
				>
					<DropdownMenuGroup>
						{items.map((item, i) => {
							// Use a safe type for itemValue that handles undefined cases
							const itemValue = item.value !== undefined ? item.value : (item.name as unknown as T);
							const isSelected = multiple
								? values.some((v) => String(v) === String(itemValue))
								: value !== undefined && String(value) === String(itemValue);
							return (
								<DropdownMenuItem key={i} disabled={disabled} onClick={() => handleSelect(itemValue)}>
									{renderItem(item, isSelected)}
								</DropdownMenuItem>
							);
						})}
						{children}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
