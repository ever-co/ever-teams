import { useEffect, useState } from 'react';

const useFetch = <DATA>() => {
	const [data] = useState<DATA | null>(null);
	useEffect(() => {
		const getData = async () => {
			try {
				// const response: {
				// 	data: DATA;
				// 	response: Response;
				// } = await ApiCall<DATA>(props);
				// setData(response.data);
				// console.log('The response : ', response);
			} catch (error) {
				console.log('An error occured : ', error);
			}
		};
		getData();
	}, []);

	return data;
};

export { useFetch };
