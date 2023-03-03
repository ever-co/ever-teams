import { useCallback } from "react";
import { useStores } from "../../../models"
import { deleteUserRequest } from "../../client/requests/user";
import useAuthenticateUser from "./useAuthentificateUser"

export function useUser() {
    const { authenticationStore: { authToken, tenantId, organizationId } } = useStores()
    const { logOut } = useAuthenticateUser();

    const deleteUser = useCallback(async (userId: string) => {
        const { data, response } = await deleteUserRequest({
            id: userId,
            bearer_token: authToken,
            tenantId
        })
        console.log(JSON.stringify(response))
        if (response.ok) {
            logOut()
        }
    }, [])
    return {
        deleteUser
    }
}