import { removeAuthCookies } from "@app/helpers/cookies";
import { IUser } from "@app/interfaces/IUserData";
import { getAuthenticatedUserDataAPI } from "@app/services/client/api/auth";
import { userState } from "@app/stores";
import { useCallback, useMemo, useRef } from "react";
import { useRecoilState } from "recoil";

import { useQuery } from "./useQuery";

const useAuthenticateUser = (defaultUser?: IUser) => {
  const [user, setUser] = useRecoilState(userState);
  const $user = useRef(defaultUser);

  const { queryCall: refreshUserQueryCall, loading: refreshUserLoading } =
    useQuery(getAuthenticatedUserDataAPI);

  const updateUserFromAPI = useCallback(() => {
    refreshUserQueryCall().then((res) => {
      setUser(res.data.user);
    });
  }, []);

  const logOut = useCallback(() => {
    removeAuthCookies();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
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
  };
};

export default useAuthenticateUser;
