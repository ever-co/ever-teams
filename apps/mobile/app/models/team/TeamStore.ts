import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam"
import { ITeamsOut } from "./Team"

export const TeamStoreModel = types
	.model("TeamStore")
	.props({
		teams: types.frozen<ITeamsOut>(),
		activeTeam: types.frozen<IOrganizationTeamList>(),
		activeTeamId: types.optional(types.string, ""),
		teamInvitations: types.optional(types.frozen(), { items: [], total: 0 }),
		teamsFetching: types.optional(types.boolean, false),
		isTrackingEnabled: types.optional(types.boolean, false),
	})
	.views(() => ({}))
	.actions((store) => ({
		setActiveTeam(team: IOrganizationTeamList) {
			store.activeTeam = team
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
		setIsTrackingEnabled(value: boolean) {
			store.isTrackingEnabled = value
		},
		clearStoredTeamData() {
			store.teams = { items: [], total: 0 }
			store.activeTeam = null
			store.activeTeamId = ""
			store.teamInvitations = { items: [], total: 0 }
			store.isTrackingEnabled = false
		},
	}))

export interface TeamStore extends Instance<typeof TeamStoreModel> {}
export interface TeamStoreSnapshot extends SnapshotOut<typeof TeamStoreModel> {}
