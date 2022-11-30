// import { validateForm } from "@app/helpers/validations";
import { IInviteRequest } from "../interfaces/IInvite";
import { IUser } from "../interfaces/IUserData";
import {
    getTeamInvitationsRequest,
    inviteByEmailsRequest,
    // sendAuthCode,
} from "../requests/invite";

interface Params {
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

export default async function inviteByEmail({ user, organizationId, access_token, teamId, tenantId,inviteBody }: Params) {
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

    const {response}=await inviteByEmailsRequest(
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

    return response;
    // {
    //     status: 200,
    //     data: JSON.stringify(data)
    // }
}
