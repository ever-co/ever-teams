import { useEffect, useRef, useState } from 'react';
import { EmbedProject, EmbedProjectsAnswer, getEmbedProjects } from '@ever-teams/api';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

export interface IEmbedProjects {
	data: EmbedProject[] | null;
	loading: boolean;
	failed: boolean;
	// The API has no embed projects route (it predates it): the list is empty and says nothing about a project.
	unavailable: boolean;
}

// The list of a session: the person, tenant and organization signed in through getToken it was read for.
interface IProjectsOfSession extends IEmbedProjects {
	session: string | null;
}

const IDLE: IProjectsOfSession = { data: null, loading: false, failed: false, unavailable: false, session: null };
const LOADING: IProjectsOfSession = { ...IDLE, loading: true };

/**
 * An API that predates the embed projects route answers 404, or 403 `EMBED_SCOPE` from its embed guard. Any other
 * refusal is a failed read: 403 `EMBED_TOKEN_REQUIRED` (getToken answered a token that is not an embed token), 401 (an
 * expired token), 5xx.
 */
function isFromAnOlderApi(answer: { statusCode?: unknown; code?: unknown }): boolean {
	const status = Number(answer.statusCode);
	if (status === 404) {
		return true;
	}
	return status === 403 && answer.code === 'EMBED_SCOPE';
}

function projectsOfAnswer(answer: EmbedProjectsAnswer, session: string): IProjectsOfSession {
	if (Array.isArray(answer)) {
		return { ...IDLE, data: answer, session };
	}
	if (isFromAnOlderApi(answer)) {
		return { ...IDLE, data: [], unavailable: true, session };
	}
	return { ...IDLE, failed: true, session };
}

/**
 * With the host's getToken, the projects its token may track time on. Without getToken, nothing is read. A token
 * renewed for the same session keeps the list read for it; a read that failed (a 401 of a token that expired meanwhile,
 * for one) is made again with the next token. Once the host signs the person out, no list is returned.
 */
export const useEmbedProjects = (): IEmbedProjects => {
	const [projects, setProjects] = useState<IProjectsOfSession>(IDLE);

	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const { hostSignIn } = useKitOptions();
	const tenantId = user?.tenantId;
	const isSignedIn = Boolean(user?.id) && Boolean(tenantId) && Boolean(organizationId);
	const session = hostSignIn && isSignedIn ? `${user?.id}|${tenantId}|${organizationId}` : null;
	// The session whose list was read: a renewed token does not read it again.
	const listedFor = useRef<string | null>(null);

	useEffect(() => {
		// Signed out: the list is dropped, so a sign-in again (the same person too) starts from a read, not from it.
		if (!session || !tenantId) {
			listedFor.current = null;
			setProjects(IDLE);
			return;
		}
		if (listedFor.current === session) {
			return;
		}
		let current = true;
		setProjects({ ...LOADING, session });
		void getEmbedProjects(token, tenantId).then((answer) => {
			if (!current) {
				return;
			}
			const next = projectsOfAnswer(answer, session);
			if (!next.failed) {
				listedFor.current = session;
			}
			setProjects(next);
		});
		return () => {
			current = false;
		};
	}, [session, tenantId, token]);

	// A list read for another session, or for one the host has since signed out, is not shown.
	if (!session) {
		return IDLE;
	}
	if (projects.session !== session) {
		return LOADING;
	}
	return projects;
};
