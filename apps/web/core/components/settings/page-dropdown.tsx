'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
	const [paginationOptions, setPaginationOptions] = useState<number[]>(paginationPageSizeOptions);
	const [selected, setSelected] = useState<number>(itemsPerPage ?? paginationPageSizeOptions[0]);
	const [open, setOpen] = useState(false);

	const getPaginationInitialStateState = useCallback(() => {
		const MIN = paginationPageSizeOptions[0];
		let baseOptions = [...paginationPageSizeOptions];
		let valueToSelect: number;

		if (totalItems === 0) {
			valueToSelect = MIN;
		} else if (totalItems < MIN) {
			valueToSelect = totalItems;
		} else if (itemsPerPage && itemsPerPage <= totalItems) {
			valueToSelect = itemsPerPage;
		} else {
			valueToSelect = baseOptions[0];
		}

		if (!baseOptions.includes(valueToSelect)) {
			baseOptions = [valueToSelect, ...baseOptions];
		}

		const options = Array.from(new Set(baseOptions)).sort((a, b) => a - b);

		return { options, selected: valueToSelect };
	}, [totalItems, itemsPerPage]);

	useEffect(() => {
		// Sync initial values computed based on totalItems and itemsPerPage
		// Sync only if user did not change the value
		if (!didUserChangeRef.current) {
			const { options, selected } = getPaginationInitialStateState();
			setPaginationOptions(options);
			setSelected(selected);
			onChange(selected);
		}
	}, [getPaginationInitialStateState, onChange, didUserChangeRef.current, setSelected]);

	const handleChange = useCallback(
		(value: number) => {
			didUserChangeRef.current = true; // block auto-sync
			onChange(value);
			setSelected(value);
			setOpen(false);
		},
		[onChange, setSelected]
	);

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
