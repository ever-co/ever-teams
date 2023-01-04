import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStores } from "../../../models";
import { refresh } from "../../client/api/auth/refresh";
import { IUser } from "../../interfaces/interfaces/IUserData";

const useAuthenticateUser = (defaultUser?: IUser) => {
    const { authenticationStore: { user, setUser, refreshToken, setAuthToken }, teamStore: { activeTeam, activeTeamId } } = useStores();

    const $user = useRef(defaultUser);
    const intervalRt = useRef(0);
    const [isTeamManager, setTeamManager] = useState(false);



    const updateUserFromAPI = useCallback(async () => {
        const { user, access_token } = await refresh(refreshToken)
            setUser(user)
            setAuthToken(access_token)
            console.log("Refresh")
    }, []);


    $user.current = useMemo(() => {
        return user || $user.current;
    }, [user]);

    useEffect(() => {
        if (activeTeam) {
            const $u = $user.current;
            const isM = activeTeam.members.find((member) => {
                const isUser = member.employee.userId === $u?.id;
                return isUser && member.role && member.role.name === 'MANAGER';
            });
            setTeamManager(!!isM);
        } else {
            setTeamManager(false);
        }
    }, [activeTeam, user]);

    const logOut = useCallback(() => {
        // removeAuthCookies();
        clearInterval(intervalRt.current);
    }, []);

    const timeToTimeRefreshToken = useCallback((interval = 3000 * 60) => {
        clearInterval(intervalRt.current);
        intervalRt.current = setInterval(updateUserFromAPI, interval) as any;

        return () => {
            clearInterval(intervalRt.current);
        };
    }, []);

    return {
        user: $user.current,
        setUser,
        isTeamManager,
        updateUserFromAPI,
        logOut,
        timeToTimeRefreshToken,
    };
};

export default useAuthenticateUser;