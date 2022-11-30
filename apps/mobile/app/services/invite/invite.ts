// import { validateForm } from "@app/helpers/validations";
import { IInviteRequest } from "../interfaces/IInvite";
import { IUser } from "../interfaces/IUserData";
import {
    getTeamInvitationsRequest,
    inviteByEmailsRequest,
    // sendAuthCode,
} from "../requests/invite";

interface ISendInvitation {
    user: IUser;
    organizationId: string;
    access_token: string;
    teamId: string;
    tenantId: string;
    inviteBody: {
        name: string;
        email: string
    }
}
interface IGetInvitations {
    user: IUser;
    organizationId: string;
    access_token: string;
    teamId: string;
    tenantId: string;
}

export async function inviteByEmail({ user, organizationId, access_token, teamId, tenantId, inviteBody }: ISendInvitation) {
    if (!user) return {};
    console.log(inviteBody)

    const body = inviteBody as IInviteRequest;

    // const { errors, isValid: formValid } = validateForm(["email", "name"], body);

    // if (!formValid) {
    //     return {
    //         status: 400,
    //         error: JSON.stringify(errors)
    //     }
    // }

    const { response } = await inviteByEmailsRequest(
        {
            startedWorkOn: new Date().toISOString(),
            tenantId,
            organizationId,
            emailIds: [body.email],
            roleId: user.roleId!,
            invitationExpirationPeriod: "Never",
            inviteType: "EMPLOYEE",
            invitedById: user.id,
            teamIds: [teamId],
            projectIds: [teamId],
        },
        access_token
    );

    const { data } = await getTeamInvitationsRequest(
        {
            tenantId,
            teamId,
            organizationId,
            role: "EMPLOYEE",
        },
        access_token
    );

    // const { data: k } = await sendAuthCode(body.email);

    return {
        status: 200,
        data: JSON.stringify(data)
    }
}

export async function getTeamInvitations({ user, organizationId, access_token, teamId, tenantId }: IGetInvitations) {
    if (!user) return {};

    const { data } = await getTeamInvitationsRequest(
        {
            tenantId,
            teamId,
            organizationId,
            role: "EMPLOYEE",
        },
        access_token
    );
    console.log(data)
    return data
} 
