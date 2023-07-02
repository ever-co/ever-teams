import { useCallback, useEffect, useMemo, useState } from "react"
import { useStores } from "../../../models"
import { timezone } from "expo-localization"
import { useQueryClient } from "react-query"
import useFetchAllLanguages from "../../client/queries/language"

import AsyncStorage from "@react-native-async-storage/async-storage"
import I18n from "i18n-js"
import { updateUserInfoRequest } from "../../client/requests/user"
import { ILanguageItemList, IUser } from "../../interfaces/IUserData"

export function useSettings() {
	const queryClient = useQueryClient()
	const {
		authenticationStore: { user, tenantId, authToken },
	} = useStores()

	const { isLoading: languagesFetching, data: languages } = useFetchAllLanguages({
		authToken,
		tenantId,
	})

	const [languageList, setLanguageList] = useState<ILanguageItemList[]>([])

	const preferredLanguage = useMemo(
		() =>
			languages?.items.find(
				(l: ILanguageItemList) => l?.code === user?.preferredLanguage,
			) as ILanguageItemList,
		[languages, user],
	)

	const updateUserInfo = useCallback(async (userBody: IUser) => {
		const { data } = await updateUserInfoRequest(
			{
				id: userBody.id,
				data: userBody,
				tenantId,
			},
			authToken,
		)
		queryClient.invalidateQueries("user")
		return data
	}, [])

	const onDetectTimezone = useCallback(async () => {
		if (timezone) {
			await updateUserInfoRequest(
				{
					id: user.id,
					data: {
						...(user as IUser),
						timeZone: timezone,
					},
					tenantId,
				},
				authToken,
			)
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
			AsyncStorage.setItem("Language", preferredLanguage.code)
			I18n.locale = preferredLanguage.code
		}
	}, [preferredLanguage])

	return {
		isLoading: !user,
		updateUserInfo,
		onDetectTimezone,
		languageList,
		preferredLanguage,
	}
}
