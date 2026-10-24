/* eslint-disable no-void */
import { authFormValidate } from '../../../../helpers/validations';
import { ISignInDataAPI } from '../../../interfaces/IAuthentication';
import { signInWorkspaceRequest } from '../../requests/auth';

import { getUserOrganizationsRequest } from '../../requests/organization';
import { getAllOrganizationTeamRequest } from '../../requests/organization-team';
import {
	clearPendingSignup,
	loadPendingSignup,
	pickTokenOrganization,
	savePendingSignup,
	setupConfirmedSignupWorkspace
} from './workspace-setup';

/** The sign-in answer for a workspace whose setup could not be checked or completed: the person signs in again. */
function setupError() {
	return {
		response: {
			status: 400,
			errors: {
				email: 'Your workspace setup could not be completed. Please try again.'
			}
		}
	};
}

export async function signIn(params: ISignInDataAPI) {
	const { errors, valid: formValid } = authFormValidate(['email'], params as any);

	if (!formValid) {
		return {
			response: {
				status: 400,
				errors
			}
		};
	}

	/**
	 * Get the first team from first organization
	 */

	// Get login data
	const { data } = await signInWorkspaceRequest(params.email, params.token);

	const tenantId = data.user?.tenantId || '';
	const accessToken = data.token;
	const userId = data.user?.id;

	// An account with no tenant yet has no organization to list (and the list needs a tenant)
	const lookup = tenantId ? await getUserOrganizationsRequest({ tenantId, userId }, accessToken) : undefined;
	// The request helper answers an HTTP error instead of throwing: a failed or malformed read is a sign-in error,
	// never "no organization" (which would set up a second workspace for the owner of a tenant)
	if (lookup && (!lookup.response.ok || !Array.isArray(lookup.data?.items))) {
		return {
			response: {
				status: 400,
				errors: {
					email: 'Your workspace could not be loaded. Please try again.'
				}
			}
		};
	}
	const organizations = lookup?.data;

	const organization = pickTokenOrganization(organizations?.items, accessToken);

	// A sign-up confirmed after register has no workspace yet: set it up now. The owner of a tenant whose setup stopped
	// half-way (no organization yet) resumes it in that tenant; any other account in a tenant is left alone.
	const ownsIncompleteTenant = !!tenantId && (data.user as { role?: { name?: string } })?.role?.name === 'SUPER_ADMIN';
	const pending = await loadPendingSignup(params.email);

	// A setup that stopped after the organization (it has no team yet) resumes too, where it was started: the device
	// keeps the mark of a setup in progress until it completes
	let resumeOrganizationId: string | undefined;
	if (organization && ownsIncompleteTenant && pending) {
		const teams = await getAllOrganizationTeamRequest(
			{ tenantId, organizationId: organization.organizationId, relations: [] },
			accessToken
		);
		// As for the organizations: a failed read is a sign-in error, never "it has teams" (that would admit a
		// workspace whose setup did not finish)
		if (!teams.response.ok || !Array.isArray(teams.data?.items)) return setupError();
		if (teams.data.items.length === 0) resumeOrganizationId = organization.organizationId;
	}

	if (userId && (resumeOrganizationId || (!organization && (!tenantId || ownsIncompleteTenant)))) {
		if (!pending) await savePendingSignup(params.email, null);
		const employeeId = (data.user as { employee?: { id?: string } } | undefined)?.employee?.id;
		const setup = await setupConfirmedSignupWorkspace({
			accessToken,
			refreshToken: data.refresh_token,
			userId,
			name: [data.user?.firstName, data.user?.lastName].filter(Boolean).join(' '),
			team: pending?.team,
			existingTenantId: tenantId || undefined,
			existingOrganizationId: resumeOrganizationId,
			existingEmployeeId: resumeOrganizationId ? employeeId : undefined
		});
		// A resumed setup that failed again keeps its mark: the next sign-in retries, this one does not get in
		if (!setup && resumeOrganizationId) return setupError();
		if (setup) {
			await clearPendingSignup(params.email);
			return {
				response: {
					data: {
						authStoreData: {
							access_token: setup.accessToken,
							refresh_token: setup.refreshToken,
							tenantId: setup.tenantId,
							organizationId: setup.organizationId,
							user: data.user
						}
					}
				},
				status: 200
			};
		}
	}

	if (!organization) {
		return {
			response: {
				status: 400,
				errors: {
					email: 'Your account isn’t fully set up yet'
				}
			}
		};
	}

	return {
		response: {
			data: {
				authStoreData: {
					access_token: accessToken,
					refresh_token: data.refresh_token,
					tenantId,
					organizationId: organization.organizationId,
					user: data.user
				}
			}
		},
		status: 200
	};
}
