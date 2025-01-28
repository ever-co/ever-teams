import axios from 'axios';

const instance = axios.create({
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json'
    }
});

export const get = async (baseURL: string, path: string, params?:any, timeout?: number) => {
    instance.defaults.baseURL = baseURL;
    if (timeout) {
        instance.defaults.timeout = timeout;
    }
    return instance.get(path, params);
}
