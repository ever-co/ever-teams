'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from '../features/projects/add-or-edit-project/steps/basic-information-form';
import { paginationPageSizeOptions } from '@/core/constants/config/constants';

interface IProps {
	itemPerPage: number;
	onChange: (value: number) => void;
	totalItems: number;
}

export const PaginationDropdown = ({ itemPerPage, onChange, totalItems }: IProps) => {
	const [paginationOptions, setPaginationOptions] = useState<number[]>(paginationPageSizeOptions);
	const calculatePaginationOptions = useCallback(() => {
		const MIN_ITEMS_PER_PAGE = 5;
		const MAX_ITEMS_PER_PAGE = 50;

		const total = itemPerPage < MIN_ITEMS_PER_PAGE ? itemPerPage : totalItems;

		const options = paginationPageSizeOptions.filter((opt) => opt <= total);

		if (totalItems <= MIN_ITEMS_PER_PAGE) {
			options.push(totalItems);
		} else if (totalItems > MAX_ITEMS_PER_PAGE) {
			const rounded = Math.ceil(totalItems / 10) * 10;
			if (!options.includes(rounded)) {
				options.push(rounded);
			}
		}

		console.log(itemPerPage, totalItems, options);

		return Array.from(new Set(options)).sort((a, b) => a - b);
	}, [totalItems, itemPerPage]);

	const basePaginationOptions = useMemo(
		() => calculatePaginationOptions(),
		[totalItems, calculatePaginationOptions, itemPerPage]
	);

	useEffect(() => {
		setPaginationOptions(calculatePaginationOptions());
	}, [totalItems, calculatePaginationOptions, itemPerPage]);

	return (
		<Select
			options={paginationOptions.map((item) => ({
				id: String(item),
				value: item
			}))}
			selected={String(paginationOptions.find((item) => item === itemPerPage))}
			onChange={(value) => onChange(parseInt(value))}
			renderValue={(selected) =>
				`Show ${selected ?? String(paginationOptions.find((item) => item === itemPerPage))}`
			}
		/>
	);
};
