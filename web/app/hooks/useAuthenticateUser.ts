import { removeAuthCookies } from "@app/helpers/cookies";
import { IUser } from "@app/interfaces/IUserData";
import {
  getAuthenticatedUserDataAPI,
  refreshTokenAPI,
} from "@app/services/client/api/auth";
import { userState } from "@app/stores";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRecoilState } from "recoil";
import { useOrganizationTeams } from "./useOrganizationTeams";

import { useQuery } from "./useQuery";

const useAuthenticateUser = (defaultUser?: IUser) => {
  const [user, setUser] = useRecoilState(userState);
  const $user = useRef(defaultUser);
  const intervalRt = useRef(0);
  const { activeTeam } = useOrganizationTeams();
  const [isTeamManager, setTeamManager] = useState(false);

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

  useEffect(() => {
    if (activeTeam) {
      const $u = $user.current;
      const isM = activeTeam.members.find((member) => {
        const isUser = member.employee.userId === $u?.id;
        return isUser && member.role && member.role.name === "MANAGER";
      });
      setTeamManager(!!isM);
    } else {
      setTeamManager(false);
    }
  }, [activeTeam, user]);

  const logOut = useCallback(() => {
    removeAuthCookies();
    window.clearInterval(intervalRt.current);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const timeToTimeRefreshToken = useCallback((interval = 3000 * 60) => {
    window.clearInterval(intervalRt.current);
    intervalRt.current = window.setInterval(refreshTokenAPI, interval);

    return () => {
      window.clearInterval(intervalRt.current);
    };
  }, []);

  return {
    user: $user.current,
    setUser,
    isTeamManager,
    updateUserFromAPI,
    refreshUserLoading,
    logOut,
    timeToTimeRefreshToken,
  };
};

export default useAuthenticateUser;
