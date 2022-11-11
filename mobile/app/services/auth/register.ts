import { useNavigation } from "@react-navigation/native";
import { api } from "../api/api";
import LocalStorage from "../api/tokenHandler";
import { ILoginReponse } from "../interfaces/IAuthentication";
import { IOrganizationTeam } from "../interfaces/IOrganizationTeam";
import { loginUserRequest, registerUserRequest } from "../requests/auth";
import { createOrganizationRequest } from "../requests/organization";
import { createOrganizationTeamRequest } from "../requests/organization-team";
import { createTenantRequest } from "../requests/tenant";


export interface IRegister {
    name: string;
    team: string;
    email: string;
}

export async function register(params: IRegister) {

    // General a random password with 8 chars
  const password = "123456";
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

  // Create user tenant
  const { data: tenant } = await createTenantRequest(params.team, loginRes.token);

  // Create user organization
  const { data: organization } = await createOrganizationRequest(
    {
      currency: "USD",
      name: params.team,
      tenantId: tenant.id,
    },
    loginRes.token
  );

  // Create user organization team
  const { data: team } = await createOrganizationTeamRequest(
    {
      name: params.team,
      tenantId: tenant.id,
      organizationId: organization.id,
      managers: [user.id],
    },
    loginRes.token
  );

// Save Bearer token
  LocalStorage.set("token", loginRes.token);
    
 const res:IRegisterResponse= {
    status:200,
    loginRes,
    team
  };
  console.log(res);
 return res;
  
} 

export interface IRegisterResponse{
    status:200;
    loginRes:ILoginReponse;
    team:IOrganizationTeam;
}