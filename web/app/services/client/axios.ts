import axios, { AxiosResponse } from "axios";
import { getCookies } from "../../helpers/getCookies";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30 * 1000,
});

api.interceptors.request.use(
  async (config: any) => {
    const { token } = getCookies();

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error: any) => {
    Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: { response: AxiosResponse }) => {
    const statusCode = error.response?.status;

    if (statusCode === 401) {
      //await signOut();
      window.location.assign(`${process.env.NEXT_PUBLIC_WEBSITE_URL}`);
    }

    return Promise.reject(error);
  }
);

export default api;
