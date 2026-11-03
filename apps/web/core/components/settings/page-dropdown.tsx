'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { paginationPageSizeOptions } from '@/core/constants/config/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { clsxm } from '@/core/lib/utils';
import { ChevronDown } from '@/core/components/icons';
import { controlRecipe } from '@/core/components/common/input';

const TRIGGER_CLASS = clsxm(controlRecipe, 'z-10 flex h-8 w-[145px] items-center justify-between gap-2 px-2.5 text-xs');

interface IProps {
	onChange: (value: number) => void;
	totalItems: number;
	itemsPerPage?: number;
}

export const PaginationItemsDropdown = ({ onChange, totalItems, itemsPerPage }: IProps) => {
	const didUserChangeRef = useRef(false);
	const MIN = paginationPageSizeOptions[0];

	const initialState = useMemo(() => {
		let baseOptions = [...paginationPageSizeOptions];
		let selectedValue: number;

		if (totalItems === 0) {
			selectedValue = MIN;
		} else if (totalItems < MIN) {
			selectedValue = totalItems;
		} else if (itemsPerPage && itemsPerPage <= totalItems) {
			selectedValue = itemsPerPage;
		} else {
			selectedValue = MIN;
		}

		if (!baseOptions.includes(selectedValue)) {
			baseOptions = [selectedValue, ...baseOptions];
		}

		const options = Array.from(new Set(baseOptions)).sort((a, b) => a - b);
		return { options, selected: selectedValue };
	}, [totalItems, itemsPerPage]);

	const [paginationOptions, setPaginationOptions] = useState(initialState.options);
	const [selected, setSelected] = useState(initialState.selected);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		// If user changed the value, do not update with initial state
		if (!didUserChangeRef.current) {
			setPaginationOptions(initialState.options);
			setSelected(initialState.selected);
			onChange(initialState.selected);
		}
	}, [initialState]);

	const handleChange = (value: number) => {
		// Set the flag to true to indicate that the user has changed the value
		didUserChangeRef.current = true;
		onChange(value);
		setSelected(value);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger className={TRIGGER_CLASS}>
				<span className="text-xs">{`Show ${selected} item${selected > 1 ? 's' : ''}`}</span>
				<ChevronDown
					className={clsxm(
						'size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-in-out',
						open && 'rotate-180'
					)}
					aria-hidden="true"
				/>
			</PopoverTrigger>

			<PopoverContent className="z-50 w-36 rounded-xl bg-popover p-1 text-popover-foreground shadow-md shadow-black/6.5 hairline-ring ring-border">
				{paginationOptions.map((item) => (
					<div
						key={item}
						onClick={() => handleChange(item)}
						className={clsxm(
							'cursor-pointer rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-foreground/5',
							item === selected && 'bg-foreground/5 font-medium'
						)}
					>
						{`Show ${item} item${item > 1 ? 's' : ''}`}
					</div>
				))}
			</PopoverContent>
		</Popover>
	);
};
