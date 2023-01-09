import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { ISupportedLanguage } from "../screens/Authenticated/SettingScreen/components/LanguageModal"

export const AuthenticationStoreModel = types
  .model("AuthenticationStore")
  .props({
    authToken: types.maybe(types.string),
    refreshToken: types.maybe(types.string),
    authEmail: types.optional(types.string, ""),
    authTeamName: types.optional(types.string, ""),
    authUsername: types.optional(types.string, ""),
    authConfirmCode: types.optional(types.string, ""),
    authInviteCode: types.optional(types.string, ""),
    organizationId: types.optional(types.string, ""),
    tenantId: types.optional(types.string, ""),
    user: types.optional(types.frozen(), {}),
    employeeId: types.optional(types.string, ""),
    preferredLanguage: types.optional(types.frozen(), null),
    isDarkMode: types.optional(types.boolean, false)
  })
  .views((store) => ({
    get isAuthenticated() {
      return !!store.authToken
    },
    get validationErrors() {
      return {
        authEmail: (function () {
          if (store.authEmail.length === 0) return "This filed can't be blank"
          if (store.authEmail.length < 6) return "Must be at least 6 characters"
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.authEmail))
            return "Must be a valid email address"
          return ""
        })(),
        authTeamName: (function () {
          if (store.authTeamName.length === 0) return "This filed can't be blank"
          return ""
        })(),
        authUsername: (function () {
          if (store.authUsername.length === 0) return "This filed can't be blank"
          return ""
        })(),

        authConfirmCode: (function () {
          if (store.authConfirmCode.length === 0) return "This filed can't be blank"
          return ""
        })(),
      }
    },
  }))
  .actions((store) => ({
    setAuthToken(value?: string) {
      store.authToken = value
    },
    setAuthEmail(value: string) {
      store.authEmail = value.replace(/ /g, "")
    },
    setAuthTeamName(value: string) {
      store.authTeamName = value
    },
    setAuthConfirmCode(value: string) {
      store.authConfirmCode = value.replace(/ /g, "")
    },
    setAuthInviteCode(value: string) {
      store.authInviteCode = value.replace(/ /g, "")
    },
    setAuthUsername(value: string) {
      store.authUsername = value
    },
    setOrganizationId(value: string) {
      store.organizationId = value.replace(/ /g, "")
    },
    setEmployeeId(value: string) {
      store.employeeId = value.replace(/ /g, "")
    },
    setUser(value: any) {
      store.user = value
    },
    setRefreshToken(value: string) {
      store.refreshToken = value
    },
    setTenantId(value: string) {
      store.tenantId = value.replace(/ /g, "")
    },
    setPreferredLanguage(locale: ISupportedLanguage) {
      store.preferredLanguage = locale
    },
    toggleTheme() {
      store.isDarkMode = !store.isDarkMode
    },
    logout() {
      store.authToken = ""
      store.authEmail = ""
      store.authTeamName = ""
      store.authUsername = ""
      store.authInviteCode = ""
      store.authConfirmCode =
        store.tenantId = ""
      store.organizationId = ""
      store.user = null
      store.employeeId = ""
      store.refreshToken = ""
    },
  }))

export interface AuthenticationStore extends Instance<typeof AuthenticationStoreModel> { }
export interface AuthenticationStoreSnapshot extends SnapshotOut<typeof AuthenticationStoreModel> { }
