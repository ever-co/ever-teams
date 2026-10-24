/* eslint-disable no-void */
import { authFormValidate } from '../../../../helpers/validations';
import { ISignInDataAPI } from '../../../interfaces/IAuthentication';
import { signInWorkspaceRequest } from '../../requests/auth';

import { getUserOrganizationsRequest } from '../../requests/organization';
import { pickTokenOrganization, setupConfirmedSignupWorkspace } from './workspace-setup';

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
	const organizations = tenantId
		? (await getUserOrganizationsRequest({ tenantId, userId }, accessToken)).data
		: undefined;

	const organization = pickTokenOrganization(organizations?.items, accessToken);

	// A sign-up confirmed after register has no workspace yet: set it up now. The owner of a tenant whose setup stopped
	// half-way (no organization yet) resumes it in that tenant; any other account in a tenant is left alone.
	const ownsIncompleteTenant = !!tenantId && (data.user as { role?: { name?: string } })?.role?.name === 'SUPER_ADMIN';
	if (!organization && userId && (!tenantId || ownsIncompleteTenant)) {
		const setup = await setupConfirmedSignupWorkspace({
			accessToken,
			refreshToken: data.refresh_token,
			userId,
			name: [data.user?.firstName, data.user?.lastName].filter(Boolean).join(' '),
			existingTenantId: tenantId || undefined
		});
		if (setup) {
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
