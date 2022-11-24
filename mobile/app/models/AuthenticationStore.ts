import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { typeTeam } from "../services/interfaces/IOrganizationTeam"

export const AuthenticationStoreModel = types
  .model("AuthenticationStore")
  .props({
    authToken: types.maybe(types.string),
    authEmail: types.optional(types.string, ""),
    authTeamName: types.optional(types.string, ""),
    authUsername: types.optional(types.string, ""),
    authConfirmCode: types.optional(types.string, ""),
    authInviteCode: types.optional(types.string, ""),
    activeTeamState: types.optional(types.frozen(), {}),
    activeTeamIdState:types.optional(types.string, ""),
    organizationId:types.optional(types.string, ""),
    tenantId:types.optional(types.string, ""),
    userId:types.optional(types.string, ""),
    employeeId:types.optional(types.string, ""),
    activeTaskState:types.optional(types.frozen(), {}),
    activeTaskId:types.optional(types.string, ""),
    fetchingTeams:types.optional(types.boolean, false),
    fetchingTasks:types.optional(types.boolean, false),
  })
  .views((store) => ({
    get isAuthenticated() {
      return !!store.authToken
    },
    get activeTeamStats() {
      return store.activeTeamState
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
      store.authTeamName = value.replace(/ /g, "")
    },
    setAuthConfirmCode(value: string) {
      store.authConfirmCode = value.replace(/ /g, "")
    },
    setAuthInviteCode(value: string) {
      store.authInviteCode = value.replace(/ /g, "")
    },
    setAuthUsername(value: string) {
      store.authUsername = value.replace(/ /g, "")
    },
    setActiveTeamState(value: any) {
      store.activeTeamState = value
    },
    setActiveTeamId(value: string) {
      store.activeTeamIdState = value.replace(/ /g, "")
    },
    setOrganizationId(value: string) {
      store.organizationId = value.replace(/ /g, "")
    }, 
    setEmployeeId(value :string){
      store.employeeId=value.replace(/ /g, "")
    },
    setUserId(value :string){
      store.userId=value.replace(/ /g, "")
    },
    setTenantId(value: string) {
      store.tenantId = value.replace(/ /g, "")
    },
    setActiveTaskId(value: string) {
      store.activeTaskId = value.replace(/ /g, "")
    },
    setActiveTaskState(value: any) {
      store.activeTaskState = value
    },
    setFetchingTeams(value: boolean) {
      store.fetchingTeams= value
    },
    setFetchingTasks(value: boolean) {
      store.fetchingTasks= value
    },
    logout() {
      store.authToken = undefined
      store.authEmail = ""
      store.authTeamName = ""
      store.authUsername = ""
      store.authInviteCode = ""
      store.authConfirmCode = ""
      store.tenantId=""
      store.organizationId=""
      store.activeTeamIdState=""
      store.userId=""
      store.activeTeamState={}
      store.employeeId=""
      store.activeTaskId=""
      store.activeTaskState={}
      store.fetchingTasks=false
      store.fetchingTeams=false
    },
  }))

export interface AuthenticationStore extends Instance<typeof AuthenticationStoreModel> {}
export interface AuthenticationStoreSnapshot extends SnapshotOut<typeof AuthenticationStoreModel> {}
