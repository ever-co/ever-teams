import { useCallback, useEffect } from "react";
import { useStores } from "../../../models"
import { useQueryClient } from "react-query";
import useFetchCurrentUserData from "../../client/queries/user/user";
import { updateUserInfoRequest } from "../../client/requests/user";
import { IUser } from "../../interfaces/IUserData";

export function useSettings() {
    const queryClient = useQueryClient();
    const {
        authenticationStore: { tenantId, organizationId, authToken, setUser },
    } = useStores();
    const { isLoading, data: userData } = useFetchCurrentUserData({ authToken })

    const updateUserInfo = useCallback(async (userBody: IUser) => {
        const { data } = await updateUserInfoRequest({
            id: userBody.id,
            data: userBody,
            tenantId
        }, authToken)
        queryClient.invalidateQueries("user")
        return data
    }, [])

    useEffect(()=>{
        setUser(userData)
    },[userData])
    return {
        user: userData,
        isLoading,
        updateUserInfo
    }
}