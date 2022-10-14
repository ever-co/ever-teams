/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-explicit-any */

import jwtDecode from "jwt-decode"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type DecodedToken = {
  readonly tokenType: string
  readonly id: string
  readonly iat: number
  readonly exp: number
}

export default class LocalStorage {
  readonly decoded: DecodedToken

  constructor(readonly token?: string) {
    this.decoded = {
      tokenType: "",
      id: "",
      iat: 0,
      exp: 0,
    }

    try {
      if (token) this.decoded = jwtDecode(token)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("AuthToken - constructor()", e)
    }
  }

  get expiresAt(): Date {
    return new Date(this.decoded.exp * 1000)
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  get isAuthenticated(): boolean {
    return !this.isExpired
  }

  get bearerString() {
    return `Bearer ${this.token}`
  }

  static async get(item: string) {
    // eslint-disable-next-line no-return-await
    return AsyncStorage.getItem(item)
  }

  static async set(item: string, value: any) {
    // eslint-disable-next-line no-return-await
    if (item === "access-token" || item === "refresh-token") {
      return AsyncStorage.setItem(item, value)
    }
    return AsyncStorage.setItem(item, JSON.stringify(value))
  }

  static async remove(item: string) {
    return AsyncStorage.removeItem(item)
  }
}

export const getToken = async () => {
  try {
    const token = await LocalStorage.get("token")
    return token?.toString() || ""
  } catch (error) {
    return ""
  }
}

export const localStorageInstance = new LocalStorage();
