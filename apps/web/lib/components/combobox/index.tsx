"use client"

import * as React from "react"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { cn } from "lib/utils"
import { Button } from "@components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@components/ui/command"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@components/ui/popover"

interface ComboboxProps<T> {
    items: T[]
    itemToString: (item: T) => string
    itemToValue: (item: T) => string
    placeholder?: string
    buttonWidth?: string
    popoverWidth?: string
    commandInputHeight?: string
    noResultsText?: string
    onChangeValue?: (value: T | null) => void
    className?: string
}

export function CustomCombobox<T>({
    items,
    itemToString,
    itemToValue,
    placeholder = "Select item...",
    buttonWidth = "w-[200px]",
    popoverWidth = "w-[200px]",
    commandInputHeight = "h-9",
    noResultsText = "No item found.",
    onChangeValue,
    className,
}: ComboboxProps<T>) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState<T | null>(null)

    const handleSelect = (currentValue: string) => {
        const selectedItem = items.find(item => itemToValue(item) === currentValue) || null
        setValue(selectedItem)
        setOpen(false)
        if (onChangeValue) {
            onChangeValue(selectedItem)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(`${buttonWidth} justify-between`, className)}
                >
                    {value
                        ? itemToString(value)
                        : placeholder}
                    <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={`${popoverWidth} p-0`}>
                <Command>
                    <CommandInput placeholder="Search item..." className={commandInputHeight} />
                    <CommandList>
                        <CommandEmpty>{noResultsText}</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    className="w-full"
                                    key={itemToValue(item)}
                                    value={itemToValue(item)}
                                    onSelect={handleSelect}>
                                    {itemToString(item)}
                                    <CheckIcon
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            value && itemToValue(value) === itemToValue(item) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
