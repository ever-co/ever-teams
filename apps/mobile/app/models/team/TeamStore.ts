import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { boolean } from "yargs";
import { IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam";
import { getUserOrganizationsRequest } from "../../services/client/requests/organization";
import { createOrganizationTeamRequest, getAllOrganizationTeamRequest } from "../../services/client/requests/organization-team";
import { ICreateTeamParams, IGetTeamsParams, ITeamsOut } from "./team";
import { IUserOrganization } from "../../services/interfaces/IOrganization";

export const TeamStoreModel = types
    .model("TeamStore")
    .props({
        teams: types.optional(types.frozen(), { items: [], total: 0 }),
        activeTeam: types.optional(types.frozen(), {}),
        activeTeamId: types.optional(types.string, ""),
        teamInvitations: types.optional(types.frozen(), { items: [], total: 0 }),
        teamsFetching: types.optional(types.boolean, false)
    })
    .views((store) => ({

    }))
    .actions((store) => ({

        setActiveTeam(team: IOrganizationTeamList) {
            store.activeTeam = team;
            store.activeTeamId = team.id
        },
        setActiveTeamId(id: string) {
            store.activeTeamId = id

        },
        setOrganizationTeams(teams: ITeamsOut) {
            store.teams = teams
        },
        setTeamInvitations(invitations: any) {
            store.teamInvitations = invitations
        },
        setTeamsFetching(value: boolean) {
            store.teamsFetching = value
        },
        clearStoredTeamData() {
            store.teams = { items: [], total: 0 },
                store.activeTeam = {}
            store.activeTeamId = "",
                store.teamInvitations = { items: [], total: 0 }
        }
    }))

export interface TeamStore extends Instance<typeof TeamStoreModel> { }
export interface TeamStoreSnapshot extends SnapshotOut<typeof TeamStoreModel> { }

