import { clsxm } from '@/core/lib/utils';
import { Button } from '@/core/components/duplicated-components/_button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { cn } from '@/core/lib/helpers';
import { ChevronDown, X } from '@/core/components/icons';
import React, { JSX, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { statusColor } from '..';

interface MultiSelectProps<T> {
	items: T[];
	value?: T[]; // <-- controlled state
	onValueChange?: (value: T | T[] | null) => void;
	itemToString: (item: T) => string;
	itemId: (item: T) => string;
	triggerClassName?: string;
	popoverClassName?: string;
	renderItem?: (item: T, onClick: () => void, isSelected: boolean) => JSX.Element;
	multiSelect?: boolean;
	localStorageKey?: string;
}

export function MultiSelect<T>({
	items,
	value,
	onValueChange,
	itemToString,
	itemId,
	triggerClassName = '',
	popoverClassName = '',
	renderItem,
	multiSelect = false,
	localStorageKey = 'select-items-selected'
}: MultiSelectProps<T>) {
	const t = useTranslations();
	const isControlled = value !== undefined;

	// Internal state only if not controlled (optional here, but useful if you want fallback)
	const [internalSelectedItems, setInternalSelectedItems] = useState<T[]>(() => {
		if (typeof window === 'undefined') return [];
		try {
			const saved = localStorage.getItem(localStorageKey);
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	});

	const selectedItems = isControlled ? value! : internalSelectedItems;

	const [isPopoverOpen, setPopoverOpen] = useState(false);
	const [popoverWidth, setPopoverWidth] = useState<number | null>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	// Synchronize the selection with the parent
	const updateSelectedItems = useCallback(
		(newItems: T[]) => {
			if (!isControlled) {
				setInternalSelectedItems(newItems);
			}
			if (onValueChange) {
				onValueChange(multiSelect ? newItems : newItems[0] || null);
			}
		},
		[isControlled, onValueChange, multiSelect]
	);

	const onClick = useCallback(
		(item: T) => {
			let newSelectedItems: T[];
			if (multiSelect) {
				if (selectedItems.some((selectedItem) => itemId(selectedItem) === itemId(item))) {
					newSelectedItems = selectedItems.filter((selectedItem) => itemId(selectedItem) !== itemId(item));
				} else {
					newSelectedItems = [...selectedItems, item];
				}
			} else {
				newSelectedItems = [item];
				setPopoverOpen(false);
			}
			updateSelectedItems(newSelectedItems);
		},
		[updateSelectedItems, selectedItems, itemId, multiSelect]
	);

	const removeItem = useCallback(
		(item: T) => {
			const newSelectedItems = selectedItems.filter((selectedItem) => itemId(selectedItem) !== itemId(item));
			updateSelectedItems(newSelectedItems);
		},
		[updateSelectedItems, selectedItems, itemId]
	);

	useEffect(() => {
		if (triggerRef.current) {
			setPopoverWidth(triggerRef.current.offsetWidth);
		}
	}, []);

	return (
		<div className="overflow-hidden relative w-full">
			<Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
				<PopoverTrigger asChild>
					<Button
						ref={triggerRef}
						onClick={() => setPopoverOpen(!isPopoverOpen)}
						variant="outline"
						size="lg"
						className={cn('w-full justify-between px-3 text-left font-normal', triggerClassName)}
					>
						{selectedItems.length > 0 ? (
							<span className="truncate">
								{multiSelect
									? t('common.ITEMS_SELECTED', { count: selectedItems.length })
									: itemToString(selectedItems[0])}
							</span>
						) : (
							<span className="text-muted-foreground">{t('common.SELECT_ITEMS')}</span>
						)}
						<ChevronDown
							className={cn(
								'size-4 shrink-0 text-muted-foreground transition-transform',
								isPopoverOpen && 'rotate-180'
							)}
						/>
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className={cn('w-full max-w-full max-h-[80vh] p-1', popoverClassName)}
					style={{ width: popoverWidth || 'auto', overflow: 'auto' }}
				>
					<ul className="w-full max-h-[80vh] overflow-auto flex flex-col gap-0.5">
						{items.map((item) => {
							const isSelected = selectedItems.some(
								(selectedItem) => itemId(selectedItem) === itemId(item)
							);
							const element = renderItem ? (
								<li key={itemId(item)}>{renderItem(item, () => onClick(item), isSelected)}</li>
							) : (
								<li
									key={itemId(item)}
									onClick={() => onClick(item)}
									className={cn(
										'truncate hover:cursor-pointer hover:bg-foreground/5 w-full text-sm h-fit max-w-72 rounded-md px-2 py-1.5 whitespace-nowrap transition-colors text-ellipsis overflow-hidden',
										isSelected && 'font-medium bg-foreground/5'
									)}
								>
									{itemToString(item)}
								</li>
							);
							return element;
						})}
					</ul>
				</PopoverContent>
			</Popover>
			{selectedItems.length > 0 && (
				<div className="flex flex-wrap gap-2 mt-2">
					{selectedItems.map((item) => (
						<div
							key={itemId(item)}
							className={clsxm(
								'flex items-center justify-between px-2 py-0.5 rounded-sm text-xs font-medium',
								'dark:text-white',
								statusColor(itemToString(item))?.bg || 'bg-foreground/5'
							)}
						>
							<span>{itemToString(item)}</span>
							<button
								onClick={() => removeItem(item)}
								className="ml-1.5 text-muted-foreground transition-colors hover:text-destructive-ink"
								aria-label="Remove item"
							>
								<span className="flex justify-center items-center w-4 h-4">
									<X className="size-3.5" aria-hidden="true" />
								</span>
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
