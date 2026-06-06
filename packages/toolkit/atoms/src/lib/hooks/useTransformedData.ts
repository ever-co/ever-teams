import { transformData } from '@ever-teams/toolkit-ui';
import { useEffect, useState } from 'react';

const useTransformedData = (report: any) => {
	const [data, setData] = useState(transformData(report));
	useEffect(() => {
		setData(transformData(report));
	}, [report]);
	return { data };
};

export default useTransformedData;
