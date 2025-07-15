'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { paginationPageSizeOptions } from '@/core/constants/config/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { clsxm } from '@/core/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

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
		} else if (MIN <= totalItems) {
			selectedValue = MIN;
		} else {
			selectedValue = totalItems;
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
	}, [initialState, onChange]);

	const handleChange = (value: number) => {
		// Set the flag to true to indicate that the user has changed the value
		didUserChangeRef.current = true;
		onChange(value);
		setSelected(value);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				className={clsxm(
					'input-border',
					'flex justify-between items-center px-3 py-2 w-full text-sm rounded-xl',
					'font-normal outline-none',
					'z-10 py-0 font-medium h-[45px] w-[145px] dark:bg-dark--theme-light'
				)}
			>
				<span className="text-xs">{`Show ${selected} item${selected > 1 ? 's' : ''}`}</span>
				<ChevronDownIcon
					className={clsxm(
						'ml-2 h-5 w-5 dark:text-white transition duration-150 ease-in-out',
						open && 'rotate-180'
					)}
					aria-hidden="true"
				/>
			</PopoverTrigger>

			<PopoverContent className="w-36 p-2 bg-light--theme-light shadow dark:bg-dark--theme-light">
				{paginationOptions.map((item) => (
					<div
						key={item}
						onClick={() => handleChange(item)}
						className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 text-xs rounded"
					>
						{`Show ${item} item${item > 1 ? 's' : ''}`}
					</div>
				))}
			</PopoverContent>
		</Popover>
	);
};
