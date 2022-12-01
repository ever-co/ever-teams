
import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { IOrganizationTeam, IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam"

// interface tenant{
//     id:string;
// }

// export const EpisodeModel = types
//   .model("Episode")
//   .props({
//     tenantId: "",
//     organizationId: "",
//     name:"",
//     tenant: types.frozen<tenant>(),
//     members: types.array(),
//     tags: types.array(),
//     id: "",
//     createdAt: "",
//     updatedAt: "",
//   })

export interface IGetTeamsParams{
    tenantId:string;
    userId:string;
    authToken:string;
}

export interface ITeamsOut {
    items: IOrganizationTeamList[];
    total: number
  }

 export interface ICreateTeamParams {
    access_token: string;
    tenantId: string;
    userId:string;
    organizationId: string;
    employeeId: string;
    teamName?: string;
  }