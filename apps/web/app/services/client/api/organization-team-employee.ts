import { CreateReponse } from '@app/interfaces/IDataResponse';
import { IOrganizationTeam } from '@app/interfaces/IOrganizationTeam';
import api from '../axios';

export function deleteOrganizationEmployeeTeamAPI(id: string) {
	return api.delete<CreateReponse<IOrganizationTeam>>(
		`/organization-team-employee/${id}`
	);
}
