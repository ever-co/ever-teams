import cookie from 'js-cookie';
import { IDataResponse } from '../interfaces/IDataResponse';
import { ITokens } from '../interfaces/IUserData';

const storeUserTokens = ({ token }: ITokens): void => {
    cookie.set('token', token);
};

const handleResponse = (response: IDataResponse) => {
    const { token } = response;
    if (token) {
        cookie.set('token', token);
    }
};

export {
    storeUserTokens,
    handleResponse,
};
