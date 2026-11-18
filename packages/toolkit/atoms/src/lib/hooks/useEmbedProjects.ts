import { useEffect, useState } from 'react';
import { IServerError } from '@ever-teams/toolkit-types';
import { EmbedProject, getEmbedProjects } from '@ever-teams/api';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

export interface IEmbedProjects {
	data: EmbedProject[] | null;
	loading: boolean;
	failed: boolean;
}

// An API that predates the embed projects route answers 404, or 403 from its embed guard: it lists no project.
const ANSWERS_OF_AN_OLDER_API = [403, 404];

function projectsOfAnswer(answer: EmbedProject[] | IServerError): IEmbedProjects {
	if (Array.isArray(answer)) {
		return { data: answer, loading: false, failed: false };
	}
	const fromAnOlderApi = ANSWERS_OF_AN_OLDER_API.includes(Number(answer.statusCode));
	if (fromAnOlderApi) {
		return { data: [], loading: false, failed: false };
	}
	return { data: null, loading: false, failed: true };
}

/** With the host's getToken, the projects its token may track time on. Without getToken, nothing is read. */
export const useEmbedProjects = (): IEmbedProjects => {
	const [projects, setProjects] = useState<IEmbedProjects>({ data: null, loading: false, failed: false });

	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const { hostSignIn } = useKitOptions();

	// A token renewed for the same person does not read the list again: it waits for another person or organization.
	useEffect(() => {
		const tenantId = user?.tenantId;
		const isSignedIn = Boolean(tenantId) && Boolean(organizationId);
		const shouldRead = hostSignIn && isSignedIn;
		if (!shouldRead || !tenantId) {
			return;
		}
		let current = true;
		setProjects({ data: null, loading: true, failed: false });
		(async () => {
			const answer = await getEmbedProjects(token, tenantId);
			if (current) {
				setProjects(projectsOfAnswer(answer));
			}
		})();
		return () => {
			current = false;
		};
	}, [hostSignIn, user, organizationId]);

	return projects;
};
