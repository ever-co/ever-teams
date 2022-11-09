import { API_BASE_URL, DEFAULT_APP_PATH } from "@app/constants";
import { getActiveTeamIdCookie } from "@app/helpers/cookies";
import axios, { AxiosResponse } from "axios";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30 * 1000,
});

api.interceptors.request.use(
  async (config: any) => {
    const cookie = getActiveTeamIdCookie();

    if (cookie) {
      config.headers["Authorization"] = `Bearer ${cookie}`;
    }

    return config;
  },
  (error: any) => {
    Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: { response: AxiosResponse }) => {
    const statusCode = error.response?.status;

    if (statusCode === 401) {
      window.location.assign(DEFAULT_APP_PATH);
    }

    return Promise.reject(error);
  }
);

export default api;
