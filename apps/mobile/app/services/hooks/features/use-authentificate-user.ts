/* eslint-disable camelcase */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStores } from "../../../models"
import { refresh } from "../../client/api/auth/refresh"
import { IUser } from "../../interfaces/interfaces/IUserData"
import { useFetchCurrentUserData } from "../../client/queries/user/user"

const useAuthenticateUser = (defaultUser?: IUser) => {
	const {
		authenticationStore: { user, setUser, logout, authToken },
		teamStore: { activeTeam, clearStoredTeamData },
		TaskStore: { resetTeamTasksData },
	} = useStores()

	const $user = useRef(defaultUser)
	const intervalRt = useRef(0)
	const [isTeamManager, setTeamManager] = useState(false)

	const {
		isLoading,
		isRefetching,
		isSuccess,
		data: userData,
	} = useFetchCurrentUserData({ authToken })

	const updateUserFromAPI = useCallback(async () => {
		// The renewal sends the refresh token the app holds now and keeps both tokens of the answer itself
		// (services/client/session.ts). One the API refuses, or that cannot be made, has no profile to show.
		const { status, user: authUser } = await refresh()
		if (status !== 200 || !authUser) {
			return undefined
		}
		setUser(authUser)
		return authUser
	}, [])

	$user.current = useMemo(() => {
		// The store's user and this hook's are two declarations of the same profile
		return (user as unknown as IUser) || $user.current
	}, [user])

	useEffect(() => {
		if (activeTeam) {
			const $u = $user.current
			const isM = activeTeam.members.find((member) => {
				const isUser = member.employee.userId === $u?.id
				return isUser && member.role && member.role.name === "MANAGER"
			})
			setTeamManager(!!isM)
		} else {
			setTeamManager(false)
		}
	}, [activeTeam, user])

	const logOut = useCallback(() => {
		logout()
		resetTeamTasksData()
		clearStoredTeamData()
		clearInterval(intervalRt.current)
	}, [])

	const timeToTimeRefreshToken = useCallback((interval = 3000 * 60) => {
		clearInterval(intervalRt.current)
		intervalRt.current = setInterval(updateUserFromAPI, interval) as any

		return () => {
			clearInterval(intervalRt.current)
		}
	}, [])

	useEffect(() => {
		if (isSuccess) {
			// A refused read is not a profile, and no longer signs the person out by itself: the HTTP client has
			// tried to renew the session, and ends it only when the API refuses the refresh token
			// (services/client/session.ts). Until then the profile stays as it is, and is read again.
			if ((userData as any)?.statusCode === 401) {
				return
			}
			setUser(userData)
		}
	}, [isLoading, isRefetching])

	return {
		user: $user.current,
		setUser,
		isTeamManager,
		updateUserFromAPI,
		logOut,
		timeToTimeRefreshToken,
	}
}

export default useAuthenticateUser
