import { clsxm } from '@/app/utils';
import { Button } from '@components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { cn } from 'lib/utils';
import { useEffect, useState, useRef } from 'react';
import { MdOutlineKeyboardArrowDown, MdClose } from 'react-icons/md';
import { statusColor } from '..';

interface MultiSelectProps<T> {
    items: T[];
    onValueChange?: (value: T | T[] | null) => void;
    itemToString: (item: T) => string;
    itemId: (item: T) => string;
    triggerClassName?: string;
    popoverClassName?: string;
    renderItem?: (item: T, onClick: () => void, isSelected: boolean) => JSX.Element;
    defaultValue?: T | T[];
    multiSelect?: boolean;
    removeItems?: boolean;
    localStorageKey?: string;
}

export function MultiSelect<T>({
    items,
    onValueChange,
    itemToString,
    itemId,
    triggerClassName = '',
    popoverClassName = '',
    renderItem,
    defaultValue,
    multiSelect = false,
    removeItems,
    localStorageKey = "select-items-selected",
}: MultiSelectProps<T>) {
    const [selectedItems, setSelectedItems] = useState<T[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem(localStorageKey);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const [popoverWidth, setPopoverWidth] = useState<number | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Load selected items from localStorage on component mount
    useEffect(() => {
        if (defaultValue) {
            const initialItems = Array.isArray(defaultValue) ? defaultValue : [defaultValue];
            setSelectedItems(initialItems);
        }
    }, [defaultValue, setSelectedItems]);

    useEffect(() => {
        if (onValueChange) {
            onValueChange(multiSelect ? selectedItems : selectedItems[0] || null);
        }
    }, [selectedItems, multiSelect, onValueChange]);

    // Save selected items to localStorage whenever they change
    // Handle persistence
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(localStorageKey, JSON.stringify(selectedItems));
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItems, localStorageKey]);

    const onClick = (item: T) => {
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
        setSelectedItems(newSelectedItems);
    };

    const removeItem = (item: T) => {
        const newSelectedItems = selectedItems.filter((selectedItem) => itemId(selectedItem) !== itemId(item));
        setSelectedItems(newSelectedItems);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const removeAllItems = () => {
        setSelectedItems([]);
    };

    useEffect(() => {
        let mounted = true;
        if (removeItems) {
            if (mounted) { // deepscan-disable-line
                removeAllItems();
            }
        }
        return () => {
            mounted = false;
        };
    }, [removeItems, removeAllItems]) // deepscan-disable-line


    useEffect(() => {
        if (triggerRef.current) {
            setPopoverWidth(triggerRef.current.offsetWidth);
        }
    }, []);

    return (
        <div className="relative w-full overflow-hidden">
            <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={triggerRef}
                        onClick={() => setPopoverOpen(!isPopoverOpen)}
                        variant="outline"
                        className={cn(
                            'w-full justify-between text-left font-normal h-10 rounded-lg dark:bg-dark--theme-light',
                            triggerClassName
                        )}
                    >
                        {selectedItems.length > 0 ? (
                            <span className="truncate">
                                {multiSelect
                                    ? `${selectedItems.length} item(s) selected`
                                    : itemToString(selectedItems[0])}
                            </span>
                        ) : (
                            <span>Select items</span>
                        )}
                        <MdOutlineKeyboardArrowDown
                            className={cn('h-4 w-4 transition-transform', isPopoverOpen && 'rotate-180')}
                        />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className={cn(
                        'w-full max-w-full max-h-[80vh] border border-transparent dark:bg-dark--theme-light',
                        popoverClassName
                    )}
                    style={{ width: popoverWidth || 'auto', overflow: 'auto' }}
                >
                    <div className="w-full max-h-[80vh] overflow-auto flex flex-col">
                        {items.map((item) => {
                            const isSelected = selectedItems.some((selectedItem) => itemId(selectedItem) === itemId(item));
                            return renderItem ? (
                                renderItem(item, () => onClick(item), isSelected)
                            ) : (
                                <span
                                    onClick={() => onClick(item)}
                                    key={itemId(item)}
                                    className={cn(
                                        'truncate hover:cursor-pointer hover:bg-slate-50 w-full text-[13px] hover:rounded-lg p-1 hover:font-normal dark:text-white dark:hover:bg-primary',
                                        isSelected && 'font-semibold bg-slate-100 dark:bg-primary-light'
                                    )}
                                    style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                >
                                    {itemToString(item)}
                                </span>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
            {selectedItems.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selectedItems.map((item) => (
                        <div
                            key={itemId(item)}
                            className={clsxm(
                                "flex items-center justify-between px-2 py-[0.5px] rounded text-[12px]",
                                "dark:text-white",
                                statusColor(itemToString(item))?.bg || "bg-gray-100 dark:bg-slate-700"
                            )}
                        >
                            <span>{itemToString(item)}</span>
                            <button
                                onClick={() => removeItem(item)}
                                className="ml-2 text-gray-600 dark:text-white hover:text-red-500 dark:hover:text-red-500"
                                aria-label="Remove item"
                            >
                                <MdClose className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
