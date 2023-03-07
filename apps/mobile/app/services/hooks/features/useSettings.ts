import { useCallback, useEffect, useMemo, useState } from "react";
import { useStores } from "../../../models"
import { timezone } from "expo-localization";
import { useQueryClient } from "react-query";
import useFetchAllLanguages from "../../client/queries/language";
import useFetchCurrentUserData from "../../client/queries/user/user";

import AsyncStorage from "@react-native-async-storage/async-storage";
import I18n from "i18n-js";
import { updateUserInfoRequest } from "../../client/requests/user";
import { ILanguageItemList, IUser } from "../../interfaces/IUserData";



export function useSettings() {
    const queryClient = useQueryClient();
    const {
        authenticationStore: { tenantId, organizationId, authToken, setUser },
    } = useStores();
    const { isLoading, data: userData } = useFetchCurrentUserData({ authToken })
    const { isLoading: languagesFetching, data: languages } = useFetchAllLanguages({ authToken, tenantId })

    const [languageList, setLanguageList] = useState<ILanguageItemList[]>([])

    const preferredLanguage = useMemo(() => languages?.items.find((l: ILanguageItemList) => l?.code === userData?.preferredLanguage) as ILanguageItemList, [languages, userData])

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

    useEffect(() => {
        if (!languagesFetching) {
            setLanguageList(languages.items)
        }
    }, [languages])

    // Change Language by user preferred language
    useEffect(() => {
        if (preferredLanguage) {
            AsyncStorage.setItem("Language", preferredLanguage?.code);
            I18n.locale = preferredLanguage?.code
        }
    }, [preferredLanguage])

    return {
        user: userData,
        isLoading,
        updateUserInfo,
        onDetectTimezone,
        languageList,
        preferredLanguage,
    }
}