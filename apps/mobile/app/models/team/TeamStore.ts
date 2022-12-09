import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam";
import { getUserOrganizationsRequest } from "../../services/requests/organization";
import { createOrganizationTeamRequest, getAllOrganizationTeamRequest } from "../../services/requests/organization-team";
import { ICreateTeamParams, IGetTeamsParams, ITeamsOut } from "./team";

export const TeamStoreModel = types
    .model("TeamStore")
    .props({
        teams: types.optional(types.frozen(), { items: [], total: 0 }),
        activeTeam: types.optional(types.frozen(), {}),
        activeTeamId: types.optional(types.string, ""),
        teamInvitations: types.optional(types.frozen(), { items: [], total: 0 })
    })
    .views((store) => ({

    }))
    .actions((store) => ({
        // Create New Team
        async createTeam({ teamName, userId, tenantId, organizationId, employeeId, access_token }: ICreateTeamParams) {
            const $name = teamName.trim() || "";
            if ($name.trim().length < 2) {
                //   return {
                //     status: 400,
                //     message: "Invalid team name !",
                //   }
                return
            }
            const { data } = await createOrganizationTeamRequest(
                {
                    name: $name,
                    tenantId,
                    organizationId,
                    managerIds: [employeeId],
                },
                access_token
            );
            this.getUserTeams({ tenantId, userId, authToken: access_token });
        },
        // Get All teams
        async getUserTeams({ tenantId, userId, authToken }: IGetTeamsParams) {

            const { data: organizations } = await getUserOrganizationsRequest(
                { tenantId, userId },
                authToken
            );
        
            const call_teams = organizations.items.map((item) => {
                return getAllOrganizationTeamRequest(
                    { tenantId, organizationId: item.organizationId },
                    authToken
                );
            });

            const data: ITeamsOut = await Promise.all(call_teams).then((tms) => {
                return tms.reduce(
                    (acc, { data }) => {
                        acc.items.push(...data.items);
                        acc.total += data.total;
                        return acc;
                    },
                    { items: [] as IOrganizationTeamList[], total: 0 }
                );
            });
            this.setOrganizationTeams(data);
        },
        setActiveTeam(team: IOrganizationTeamList) {
            store.activeTeam = team;
            this.setActiveTeamId(team.id)
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
        clearStoredTeamData() {
            store.teams = { items: [], total: 0 },
                store.activeTeam = {}
            store.activeTeamId = ""
        }
    }))

export interface TeamStore extends Instance<typeof TeamStoreModel> { }
export interface TeamStoreSnapshot extends SnapshotOut<typeof TeamStoreModel> { }

