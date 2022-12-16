import { generateToken } from "../../../../helpers/generate-token";
import { authFormValidate } from "../../../../helpers/validations";
import { ILoginDataAPI } from "../../../interfaces/IAuthentication";
import { loginUserRequest, refreshTokenRequest } from "../../requests/auth";
import { acceptInviteRequest, verifyInviteCodeRequest } from "../../requests/invite";
import { getUserOrganizationsRequest } from "../../requests/organization";
import { getAllOrganizationTeamRequest } from "../../requests/organization-team";

export async function login(params: ILoginDataAPI) {


    const { errors, valid: formValid } = authFormValidate(
        ["email", "code"],
        params as any
    );

    if (!formValid) {
        return {
            response: {
                status: 400,
                errors
            }
        }
    }

    // Verify invite email and invite code
    const { data: verificationData, response: verifyResponse } = await verifyInviteCodeRequest({ email: params.email, code: parseInt(params.code) });
   

    if (!verifyResponse.ok || (verificationData as any).status == 400) {
        return {
            response: {
                status: 400,
                errors: {
                    email: "We couldn't find account  associated to this email",
                },
            }
        }
    }

 // generate a random password
    const password = "123456" || generateToken(8);
    const names = verificationData.fullName.split(" ");

    const { data, response } = await acceptInviteRequest({
        user: {
            firstName: names[0],
            lastName: names[1] || "",
            email: verificationData.email
        },
        password,
        code: parseInt(params.code),
        email: params.email
    })

    // User Login, get the access token
    const { data: loginRes } = await loginUserRequest(
        params.email,
        password
    );

    if (!response.ok || (loginRes as any).status === 404) {
        return {
            response: {
                status: 400,
                errors: {
                    email: "We couldn't find account  associated to this email",
                },
            }
        }
    }

    const tenantId = loginRes.user.tenantId || '';
    const access_token = loginRes.token;
    const userId = loginRes.user.id;

    const { data: organizations } = await getUserOrganizationsRequest(
        { tenantId, userId },
        access_token
    );
  
    const organization = organizations?.items[0];
 
    if (!organization) {
        return {
            response: {
                status: 400,
                errors: {
                    email: "Your account is not yet ready to be used on the gauzy team",
                }
            }
        }
    }

    // All above code are working well, the problem starts with this request below

    const { data: teams } = await getAllOrganizationTeamRequest(
        { tenantId, organizationId: organization.organizationId },
        access_token
    );

    const team = teams.items[0];

    if (!team) {
        return {
            status: 400,
            response: {
                errors: {
                    email: "We couldn't find any teams associated with this account",
                },
            }
        }
    }


    return {
        response: {
            status: 200,
            data: {
                team,
                loginRes,
                authStoreData: {
                    access_token: loginRes.token,
                    refresh_token: {
                        token: loginRes.refresh_token,
                    },
                    teamId: team.id,
                    tenantId,
                    organizationId: organization.organizationId,
                }
            }
        }
    }
}