import { removeAuthCookies } from "@app/helpers/cookies";
import { IUser } from "@app/interfaces/IUserData";
import {
  getAuthenticatedUserDataAPI,
  refreshTokenAPI,
} from "@app/services/client/api/auth";
import { userState } from "@app/stores";
import { useCallback, useMemo, useRef } from "react";
import { useRecoilState } from "recoil";

import { useQuery } from "./useQuery";

const useAuthenticateUser = (defaultUser?: IUser) => {
  const [user, setUser] = useRecoilState(userState);
  const $user = useRef(defaultUser);
  const intervalRt = useRef(0);

  const { queryCall: refreshUserQueryCall, loading: refreshUserLoading } =
    useQuery(getAuthenticatedUserDataAPI);

  const updateUserFromAPI = useCallback(() => {
    refreshUserQueryCall().then((res) => {
      setUser(res.data.user);
    });
  }, []);

  const logOut = useCallback(() => {
    removeAuthCookies();
    window.clearInterval(intervalRt.current);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const timeToTimeRefreshToken = useCallback((interval = 2000 * 60) => {
    window.clearInterval(intervalRt.current);
    intervalRt.current = window.setInterval(refreshTokenAPI, interval);
  }, []);

  $user.current = useMemo(() => {
    return user || $user.current;
  }, [user]);

  return {
    user: $user.current,
    setUser,
    updateUserFromAPI,
    refreshUserLoading,
    logOut,
    timeToTimeRefreshToken,
  };
};

export default useAuthenticateUser;
