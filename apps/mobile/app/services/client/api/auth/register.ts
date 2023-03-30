import { generateToken } from "../../../../helpers/generate-token"
import { authFormValidate } from "../../../../helpers/validations"
import { IRegisterDataAPI } from "../../../interfaces/IAuthentication"
import { loginUserRequest, refreshTokenRequest, registerUserRequest } from "../../requests/auth"
import { createEmployeeFromUser } from "../../requests/employee"
import { createSmtpTenantRequest } from "../../requests/features/smtp"
import { createOrganizationRequest } from "../../requests/organization"
import {
	createOrganizationTeamRequest,
	getAllOrganizationTeamRequest,
} from "../../requests/organization-team"
import { createTenantRequest } from "../../requests/tenant"

export async function register(params: IRegisterDataAPI) {
	const { errors, valid: formValid } = authFormValidate(["email", "name", "team"], params)

	if (!formValid) {
		return {
			response: {
				statut: 400,
				errors,
			},
		}
	}

	// General a random password with 8 chars
	const password = "123456" || generateToken(8)
	const names = params.name.split(" ")

	// Register user
	const { data: user } = await registerUserRequest({
		password,
		confirmPassword: password,
		user: {
			firstName: names[0],
			lastName: names[1] || "",
			email: params.email,
		},
	})

	const { data: loginRes } = await loginUserRequest(params.email, password)
	const authToken = loginRes.token

	// Create user tenant
	const { data: tenant } = await createTenantRequest(params.team, authToken)

	// Create STMP for the current Tenant
	await createSmtpTenantRequest(authToken, tenant.id)

	// Create user organization
	const { data: organization } = await createOrganizationRequest(
		{
			currency: "USD",
			name: params.team,
			tenantId: tenant.id,
			invitesAllowed: true,
		},
		authToken,
	)

	// Create employee
	const { data: employee } = await createEmployeeFromUser(
		{
			organizationId: organization.id,
			startedWorkOn: new Date().toISOString(),
			tenantId: tenant.id,
			userId: user.id,
		},
		authToken,
	)

	// Create user organization team
	const { data: team } = await createOrganizationTeamRequest(
		{
			name: params.team,
			tenantId: tenant.id,
			organizationId: organization.id,
			managerIds: [employee.id],
		},
		authToken,
	)

	const { data: teams } = await getAllOrganizationTeamRequest(
		{ tenantId: tenant.id, organizationId: organization.id },
		authToken,
	)

	const createdTeam = teams.items.find((t) => t.id === team.id)

	const { data: refreshToken } = await refreshTokenRequest(loginRes.refresh_token)
	loginRes.token = refreshToken.token

	return {
		response: {
			status: 200,
			data: {
				team: createdTeam,
				loginRes,
				employee,
			},
		},
	}
}
