import { serverFetch } from "../../fetch";
import { ITenant } from "../../../interfaces/ITenant";


export function createStmpTenantRequest(bearer_token: string, tenantId) {
    const body = {
        "fromAddress":"",
        "host": "",
        "port": 0,
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