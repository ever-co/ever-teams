import { ITenant } from "@app/interfaces/ITenant";
import { serverFetch } from "../fetch";

export function createTenantRequest(name: string, bearer_token: string) {
  return serverFetch<ITenant>("/tenant", "POST", { name }, bearer_token);
}
