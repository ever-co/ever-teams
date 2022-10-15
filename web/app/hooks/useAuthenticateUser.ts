import { useEffect } from 'react';
import { updateUserDataFromTokens } from 'app/services/auth';
import { useSelector, RootStateOrAny, useDispatch } from 'react-redux';
import AuthAC from 'store/auth/actions/AuthAC';
import { IUser } from '../interfaces/IUserData';

/** To be used with single pages that on browser reload will lose their user because there is no container component for authentication like index.tsx */
const useAuthenticateUser = () => {
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) {
      const updateUser = async () => {
        const user: IUser = await updateUserDataFromTokens();
        if (user) {
          //dispatch(AuthAC.setUser({ user }));
        }
      };
      updateUser();
    }
  }, [user, dispatch]);

  return user;
};

export default useAuthenticateUser;
