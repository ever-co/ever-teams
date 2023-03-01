import { useQuery } from "react-query"
import { getLanguageListRequest } from "../../requests/languages";

interface IGetAllLanguagesParams {
    authToken: string;
    tenantId: string;
}

const fetchAllLanguages = async (params: IGetAllLanguagesParams) => {
    const { tenantId, authToken } = params;
    const { data } = await getLanguageListRequest({
        is_system: false,
        tenantId
    }, authToken)
    return data;
};

const useFetchAllLanguages = (IGetAllLanguagesParams) => useQuery(['Languages', IGetAllLanguagesParams], () => fetchAllLanguages(IGetAllLanguagesParams));
export default useFetchAllLanguages;