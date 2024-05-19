import { useQuery } from '@tanstack/react-query';
import { getLanguageListRequest } from '../../requests/languages';

interface IGetAllLanguagesParams {
	authToken: string;
	tenantId: string;
}

const fetchAllLanguages = async (params: IGetAllLanguagesParams) => {
	const { tenantId, authToken } = params;
	const { data } = await getLanguageListRequest(
		{
			is_system: false,
			tenantId
		},
		authToken
	);
	return data;
};

const useFetchAllLanguages = (IGetAllLanguagesParams) =>
	useQuery({
		queryKey: ['Languages'],
		queryFn: () => fetchAllLanguages(IGetAllLanguagesParams)
	});
export default useFetchAllLanguages;
