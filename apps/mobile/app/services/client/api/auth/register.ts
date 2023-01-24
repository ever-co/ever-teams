import { generateToken } from "../../../../helpers/generate-token";
import { authFormValidate } from "../../../../helpers/validations";
import { IRegisterDataAPI } from "../../../interfaces/IAuthentication";
import { loginUserRequest, registerUserRequest } from "../../requests/auth";
import { createEmployeeFromUser } from "../../requests/employee";
import { createStmpTenantRequest } from "../../requests/features/smtp";
import { createOrganizationRequest, getUserOrganizationsRequest } from "../../requests/organization";
import { createOrganizationTeamRequest, getAllOrganizationTeamRequest, getOrganizationTeamRequest } from "../../requests/organization-team";
import { createTenantRequest } from "../../requests/tenant";


// export interface IRegister {
//   name: string;
//   team: string;
//   email: string;
// }

export async function register(params: IRegisterDataAPI) {

  const { errors, valid: formValid } = authFormValidate(
    ["email", "name", "team"],
    params
  );

  if (!formValid) {
    return {
      response: {
        statut: 400,
        errors
      }

    }
  }

  // General a random password with 8 chars
  const password = "123456" || generateToken(8);
  const names = params.name.split(" ");

  // Register user
  const { data: user } = await registerUserRequest({
    password: password,
    confirmPassword: password,
    user: {
      firstName: names[0],
      lastName: names[1] || "",
      email: params.email,
    },
  });

  const { data: loginRes } = await loginUserRequest(params.email, password);
  const auth_token = loginRes.token;

  // Create user tenant
  const { data: tenant } = await createTenantRequest(params.team, auth_token);

  // Create STMP for the current Tenant
  const { data } = await createStmpTenantRequest(
    auth_token, tenant.id)

  // Create user organization
  const { data: organization } = await createOrganizationRequest(
    {
      currency: "USD",
      name: params.team,
      tenantId: tenant.id,
    },
    auth_token
  );

  // Create employee
  const { data: employee } = await createEmployeeFromUser(
    {
      organizationId: organization.id,
      startedWorkOn: new Date().toISOString(),
      tenantId: tenant.id,
      userId: user.id,
    },
    auth_token
  );

  // Create user organization team
  const { data: team } = await createOrganizationTeamRequest(
    {
      name: params.team,
      tenantId: tenant.id,
      organizationId: organization.id,
      managerIds: [employee.id],
    },
    auth_token
  );

  const { data: organizations } = await getUserOrganizationsRequest(
    { tenantId: tenant.id, userId: employee.userId },
    auth_token
  );

  const { data: teams } = await getAllOrganizationTeamRequest(
    { tenantId: tenant.id, organizationId: organization.id },
    auth_token
  );

  // const team = teams.items[0];

  const createdTeam = teams.items.find((t) => t.id === team.id);

  return {
    response: {
      status: 200,
      data: {
        team: createdTeam,
        loginRes,
        employee
      }
    }
  };

}

