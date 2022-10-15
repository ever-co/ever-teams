
import { IDataResponse } from '../../interfaces/IDataResponse';
import { IRegisterData } from '../../interfaces/IUserData';
import api from './api';

const signInWithEmailAndPassword = (
    email: string,
    password: string,
): Promise<IDataResponse> => {
    return api.post(`/auth/login`, {
        email,
        password,
    });
};

const registerUserEmailPassAPI = (
    data: IRegisterData
): Promise<IDataResponse> => {
    return api.post('/auth/register', data);
};

const getUserDataAPI = (): Promise<IDataResponse> => {
    return api.get(`/auth/user-data`);
};

export {
    signInWithEmailAndPassword,
    registerUserEmailPassAPI,
    getUserDataAPI
};
