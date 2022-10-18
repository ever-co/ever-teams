import {
  ApiResponse, // @demo remove-current-line
  ApisauceInstance,
  create,
} from "apisauce"
import Config from "../../config"
import { GeneralApiProblem, getGeneralApiProblem } from "./apiProblem" // @demo remove-current-line
import type {
  ApiConfig,
  ApiFeedResponse, // @demo remove-current-line
} from "./api.types"
import type { EpisodeSnapshotIn } from "../../models/Episode" // @demo remove-current-line
import LocalStorage, { getToken } from "./tokenHandler"

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
}

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig
  authToken: string | null = null

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.loadAsync()
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
      },
    })
  }

  /**
   * @description: Load async data from local storage
   */
  private loadAsync = async () => {
    const token = await getToken()
    if (token) {
      this.authToken = token
    }
  }

  /**
   *
   * @param url: string
   * @param isProtected: if true, then we'll add the auth token to the header
   * @returns Promise<{ kind: "ok"; data: T } | GeneralApiProblem>
   */
  async commonGetApi<T>(url: string, isProtected: boolean = true): Promise<{ kind: "ok"; data: T } | GeneralApiProblem> {
    // make the api call
    const response: ApiResponse<T> = await this.apisauce.get(url, {
      headers: isProtected ? { Authorization: `Bearer ${this.authToken}` } : {},
    })

    // the typical ways to die when calling an api
    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    // transform the data into the format we are expecting
    try {
      const rawData = response.data

      return { kind: "ok", data: rawData }
    } catch (e) {
      if (__DEV__) {
        console.tron.error(`Bad data: ${e.message}\n${response.data}`, e.stack)
      }
      return { kind: "bad-data" }
    }
  }

  async commonPostApi<T>(
    url: string,
    body: any,
    isProtected: boolean = true,
  ): Promise<{ kind: "ok"; data: T } | GeneralApiProblem> {
    // make the api call
    const response: ApiResponse<T> = await this.apisauce.post(url, body, {
      headers: isProtected ? { Authorization: `Bearer ${this.authToken}` } : {},
    })

    // CHECK THE RESPONSE (@debug only)
    if (__DEV__) {
      console.log("response POST", response)
    }

    // the typical ways to die when calling an api
    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    // transform the data into the format we are expecting
    try {
      const rawData = response.data

      return { kind: "ok", data: rawData }
    } catch (e) {
      if (__DEV__) {
        console.tron.error(`Bad data: ${e.message}\n${response.data}`, e.stack)
      }
      return { kind: "bad-data" }
    }
  }

  async commonPutApi<T>(
    url: string,
    body: any,
  ): Promise<{ kind: "ok"; data: T } | GeneralApiProblem> {
    // make the api call
    const response: ApiResponse<T> = await this.apisauce.put(url, body)

    // the typical ways to die when calling an api
    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    // transform the data into the format we are expecting
    try {
      const rawData = response.data

      return { kind: "ok", data: rawData }
    } catch (e) {
      if (__DEV__) {
        console.tron.error(`Bad data: ${e.message}\n${response.data}`, e.stack)
      }
      return { kind: "bad-data" }
    }
  }

  get routes() {
    return {
      loginUser: 'auth/login',
      registerUser: 'auth/register',
      authenticatedUser: 'auth/authenticated',
      userProfile: 'user/me',
      createWorkspace: 'tenant',
      createOrganization: 'organization',
      startTimer: 'timesheet/timer/start',
      stopTimer: 'timesheet/timer/stop',
      createTeam: 'organization-team',
    }
  }

  // @demo remove-block-start
  /**
   * Gets a list of recent React Native Radio episodes.
   */
  async getEpisodes(): Promise<{ kind: "ok"; episodes: EpisodeSnapshotIn[] } | GeneralApiProblem> {
    // make the api call
    const response: ApiResponse<ApiFeedResponse> = await this.apisauce.get(
      `api.json?rss_url=https%3A%2F%2Ffeeds.simplecast.com%2FhEI_f9Dx`,
    )

    // the typical ways to die when calling an api
    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    // transform the data into the format we are expecting
    try {
      const rawData = response.data

      // This is where we transform the data into the shape we expect for our MST model.
      const episodes: EpisodeSnapshotIn[] = rawData.items.map((raw) => ({
        ...raw,
      }))

      return { kind: "ok", episodes }
    } catch (e) {
      if (__DEV__) {
        console.tron.error(`Bad data: ${e.message}\n${response.data}`, e.stack)
      }
      return { kind: "bad-data" }
    }
  }
  // @demo remove-block-end
}

// Singleton instance of the API for convenience
export const api = new Api()
