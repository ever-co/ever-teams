'use client';

import { useCallback, useEffect, useState } from 'react';
import { Select } from '../features/projects/add-or-edit-project/steps/basic-information-form';
import { paginationPageSizeOptions } from '@/core/constants/config/constants';

interface IProps {
	itemPerPage: number;
	onChange: (value: number) => void;
	totalItems: number;
}

export const PaginationItemsDropdown = ({ itemPerPage, onChange, totalItems }: IProps) => {
	const [paginationOptions, setPaginationOptions] = useState<number[]>(paginationPageSizeOptions);
	const calculatePaginationOptions = useCallback(() => {
		const MIN_ITEMS_PER_PAGE = 5;
		const MAX_ITEMS_PER_PAGE = 50;
		const options = [...paginationOptions];

		if (!options.includes(itemPerPage)) {
			options.push(itemPerPage);
		}

		if (totalItems <= MIN_ITEMS_PER_PAGE) {
			options.unshift(totalItems);
		} else if (totalItems > MAX_ITEMS_PER_PAGE) {
			const rounded = Math.ceil(totalItems / 10) * 10;
			if (!options.includes(rounded)) {
				options.push(rounded);
			}
		}

		return Array.from(new Set(options)).sort((a, b) => a - b);
	}, [totalItems, itemPerPage, paginationOptions]);

	useEffect(() => {
		setPaginationOptions(calculatePaginationOptions());
	}, [totalItems, itemPerPage]);

	return (
		<Select
			options={paginationOptions.map((item) => ({
				id: String(item),
				value: item
			}))}
			selected={String(
				paginationOptions.find((item) => {
					return item === (itemPerPage > totalItems ? totalItems : itemPerPage);
				})
			)}
			onChange={(value) => onChange(parseInt(value))}
			renderValue={(selected) => `Show ${selected}`}
		/>
	);
};
