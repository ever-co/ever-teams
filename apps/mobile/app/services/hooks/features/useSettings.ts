import { useCallback, useEffect } from "react";
import { useStores } from "../../../models"
import { timezone } from "expo-localization";
import { useQueryClient } from "react-query";
import useFetchCurrentUserData from "../../client/queries/user/user";
import { updateUserInfoRequest } from "../../client/requests/user";
import { IUser } from "../../interfaces/IUserData";
import moment from "moment";

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

    const onDetectTimezone = useCallback(async (userBody: IUser) => {
        if (timezone) {
            await updateUserInfoRequest({
                id: userBody.id,
                data: {
                    ...userBody,
                    timeZone: timezone
                },
                tenantId
            }, authToken)
            queryClient.invalidateQueries("user")
        }
    }, [])

    return {
        user: userData,
        isLoading,
        updateUserInfo,
        onDetectTimezone
    }
}