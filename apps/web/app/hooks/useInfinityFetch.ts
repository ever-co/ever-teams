'use client';

import React from 'react';

export const getPartData = ({ offset = 0, limit = 10, arr = [] }: { offset?: number; limit?: number; arr: any[] }) =>
	arr.slice(0, offset * limit + limit);

export const useInfinityScrolling = (arr: any) => {
	const [offset, setOffset] = React.useState(0);
	const [data, setData] = React.useState<any[]>(arr);

	const getSomeTasks = React.useCallback(
		(offset: number) => {
			setData(getPartData({ arr, limit: 10, offset }));
		},
		[arr]
	);

	const nextOffset = React.useCallback(() => {
		setOffset((prev) => prev + 1);
		setData((prev) => getPartData({ arr: prev, limit: 10, offset }));
	}, [offset]);

	React.useEffect(() => {
		console.log({ offset });
		getSomeTasks(offset);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [offset]);

	return {
		offset,
		setOffset,
		getSomeTasks,
		nextOffset,
		data
	};
};
