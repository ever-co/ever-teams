'use client';

import React from 'react';

export const getPartData = ({ offset = 0, limit = 10, arr = [] }: { offset?: number; limit?: number; arr: any[] }) => {
	const startIndex = offset * limit;
	if (startIndex > arr.length) return arr;
	return arr.slice(startIndex, Math.min(startIndex + limit, arr.length));
};

export const useInfinityScrolling = <T>(arr: T[], lim?: number) => {
	const limit = lim ?? 10;
	const [offset, setOffset] = React.useState(1);
	const [data, setData] = React.useState<T[]>([]);

	const getSomeTasks = React.useCallback(
		(offset: number) => {
			setData(() => {
				const newData = getPartData({ arr, limit, offset });
				return newData;
			});
		},
		[arr, limit]
	);

	const nextOffset = React.useCallback(() => {
		setOffset((prev) => prev + 1);
	}, []);

	React.useEffect(() => {
		getSomeTasks(offset);
	}, [getSomeTasks, offset]);

	return {
		offset,
		setOffset,
		getSomeTasks,
		nextOffset,
		data
	};
};
