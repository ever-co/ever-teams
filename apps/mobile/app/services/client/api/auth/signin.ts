/* eslint-disable no-void */
import { authFormValidate } from "../../../../helpers/validations"
import { ISignInDataAPI } from "../../../interfaces/IAuthentication"
import { signInWorkspaceRequest } from "../../requests/auth"

import { getUserOrganizationsRequest } from "../../requests/organization"

export async function signIn(params: ISignInDataAPI) {
	const { errors, valid: formValid } = authFormValidate(["email"], params as any)

	if (!formValid) {
		return {
			response: {
				status: 400,
				errors,
			},
		}
	}

	/**
	 * Get the first team from first organization
	 */

	// Get login data
	const { data } = await signInWorkspaceRequest(params.email, params.token)

	const tenantId = data.user?.tenantId || ""
	const accessToken = data.token
	const userId = data.user?.id

	const { data: organizations } = await getUserOrganizationsRequest(
		{ tenantId, userId },
		accessToken,
	)

	const organization = organizations?.items[0]

	if (!organization) {
		return {
			response: {
				status: 400,
				errors: {
					email: "Your account is not yet ready to be used on the Ever Teams Platform",
				},
			},
		}
	}

	return {
		response: {
			data: {
				authStoreData: {
					access_token: accessToken,
					refresh_token: data.refresh_token,
					tenantId,
					organizationId: organization.organizationId,
				},
			},
		},
		status: 200,
	}
}
