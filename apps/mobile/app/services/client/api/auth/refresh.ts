import { currentAuthenticatedUserRequest, refreshTokenRequest } from "../../requests/auth"

export const refresh = async (refresh_token: string) => {

    if (!refresh_token || refresh_token.trim().length < 2) {
        return {
            statsus: 400,
            error: 'The refresh token must be provided on the request body',
        }
    }

    const { data } = await refreshTokenRequest(refresh_token);
    if (!data) {
        return {
            status: 401
        };
    }

    const { data: user } = await currentAuthenticatedUserRequest({
        bearer_token: data.token,
    });

    return {
        status: 200,
        user: user,
        access_token: data.token
    }
}