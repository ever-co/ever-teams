import { generateToken } from "../../../../helpers/generate-token";
import { authFormValidate } from "../../../../helpers/validations";
import LocalStorage from "../../../api/tokenHandler";
import { ILoginReponse, IRegisterDataAPI } from "../../../interfaces/IAuthentication";
import { IEmployee } from "../../../interfaces/IEmployee";
import { IOrganizationTeam } from "../../../interfaces/IOrganizationTeam";
import { loginUserRequest, refreshTokenRequest, registerUserRequest } from "../../requests/auth";
import { createEmployeeFromUser } from "../../requests/employee";
import { createStmpTenantRequest } from "../../requests/features/smtp";
import { createOrganizationRequest } from "../../requests/organization";
import { createOrganizationTeamRequest } from "../../requests/organization-team";
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
  const {data:refreshRes}=await refreshTokenRequest(loginRes.refresh_token)
  // Save auth data
  LocalStorage.set("token", refreshRes.token);

  // Assign the new token from refresh token
  loginRes.token=refreshRes.token;

  return {
    response: {
      status: 200,
      data: {
        team,
        loginRes,
        employee
      }
    }
  };

}

