import { serverFetch } from "../../fetch";
import { ITenant } from "../../interfaces/ITenant";


export function createStmpTenantRequest(bearer_token: string, tenantId) {
    const body = {
        "fromAddress": "noreply@gauzy.co",
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "username": "",
        "password": ""
    }

    return serverFetch<ITenant>({
        path: "/smtp",
        method: "POST",
        body,
        tenantId,
        bearer_token,
    });
}