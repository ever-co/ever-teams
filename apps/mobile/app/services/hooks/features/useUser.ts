import { useCallback, useEffect, useState } from "react";
import { useStores } from "../../../models"
import { useFetchOrganizationUsers } from "../../client/queries/user/user";
import { deleteUserRequest } from "../../client/requests/user";
import { IUser } from "../../interfaces/IUserData";
import useAuthenticateUser from "./useAuthentificateUser"

export function useUser() {
    const { authenticationStore: { authToken, tenantId, organizationId } } = useStores()
    const { logOut } = useAuthenticateUser();
    const [allUsers, setAllUsers] = useState<IUser[]>()
    const { data, isLoading, } = useFetchOrganizationUsers({ authToken, tenantId })

    const deleteUser = useCallback(async (userId: string) => {
        const { data, response } = await deleteUserRequest({
            id: userId,
            bearer_token: authToken,
            tenantId
        })

        if (response.ok) {
            logOut()
        }
    }, [])

    useEffect(() => {
        setAllUsers(data?.items || [])
    }, [isLoading])

    return {
        deleteUser,
        allUsers
    }
}