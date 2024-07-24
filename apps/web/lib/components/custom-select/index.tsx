import { Button } from "@components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { cn } from "lib/utils";
import { useState } from "react";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";

interface SelectItemsProps<T> {
    items: T[];
    onValueChange?: (value: string) => void;
    itemToString: (item: T) => string;
    itemId: (item: T) => string;
    triggerClassName?: string;
    popoverClassName?: string;
}
/**
 *
 *
 * @export
 * @template T
 * @param {SelectItemsProps<T>} {
 *     items,
 *     onValueChange,
 *     itemToString,
 *     itemId,
 *     triggerClassName = '',
 *     popoverClassName = ''
 * }
 * @return {*}
 */
export function SelectItems<T>({
    items,
    onValueChange,
    itemToString,
    itemId,
    triggerClassName = '',
    popoverClassName = ''
}: SelectItemsProps<T>) {
    const [selectedItem, setSelectedItem] = useState<T | null>(null);
    const [isPopoverOpen, setPopoverOpen] = useState(false);

    const onClick = (item: T) => {
        setSelectedItem(item);
        setPopoverOpen(false);
        if (onValueChange) {
            onValueChange(itemId(item));
        }
    }

    return (
        <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
                <Button
                    onClick={() => setPopoverOpen(!isPopoverOpen)}
                    variant="outline"
                    className={cn(
                        "w-full justify-between text-left font-normal h-9 rounded-lg dark:bg-dark--theme-light",
                        !selectedItem && "text-muted-foreground",
                        triggerClassName
                    )}
                >
                    {selectedItem ? (
                        <span className="truncate">{itemToString(selectedItem)}</span>
                    ) : (
                        <span>Select an item</span>
                    )}
                    <MdOutlineKeyboardArrowDown
                        className={cn("mr-2 h-4 w-4 transition-transform", isPopoverOpen && "rotate-180")}
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("w-[430px] border border-transparent max-h-[80vh] dark:bg-dark--theme-light", popoverClassName)}>
                <div className="w-full max-h-[80vh] overflow-auto flex flex-col">
                    {items.map((item) => (
                        <span
                            onClick={() => onClick(item)}
                            key={itemId(item)}
                            className="truncate hover:cursor-pointer hover:bg-slate-50 w-full text-[13px] hover:rounded-lg p-1 hover:font-bold dark:text-white dark:hover:bg-primary"
                            style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {itemToString(item)}
                        </span>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
