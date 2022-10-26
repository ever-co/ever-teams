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

  $user.current = useMemo(() => {
    return user || $user.current;
  }, [user]);

  return {
    user: $user.current,
    setUser,
    updateUserFromAPI,
    refreshUserLoading,
  };
};

export default useAuthenticateUser;
