import { useQuery } from "react-query";
import { currentAuthenticatedUserRequest } from "../../requests/auth";

interface IGetUserDataParams {
    authToken: string;
}
const fetchCurrentUserData = async (params: IGetUserDataParams) => {
    const { authToken } = params;
    const { data } = await currentAuthenticatedUserRequest({
        bearer_token: authToken
    })
    return data;
};

const useFetchCurrentUserData = (IGetUserDataParams) => useQuery(['user', IGetUserDataParams], () => fetchCurrentUserData(IGetUserDataParams));
export default useFetchCurrentUserData;