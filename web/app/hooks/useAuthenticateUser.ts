import { useEffect } from 'react';

import { useSelector, useDispatch } from 'react-redux';
import { IUser, IUserData } from '../interfaces/IUserData';
import { updateUserDataFromTokens } from '../services/auth';

/** To be used with single pages that on browser reload will lose their user because there is no container component for authentication like index.tsx */
const useAuthenticateUser = () => {
  const user: IUser = useSelector((state : any) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user) {
      const updateUser = async () => {
        const user: IUserData | null = await updateUserDataFromTokens();
        if (user) {
          
        }
      };
      updateUser();
    }
  }, [user, dispatch]);

  return user;
};

export default useAuthenticateUser;
