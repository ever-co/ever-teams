import {
  IOrganization,
  IOrganizationCreate,
} from "@app/interfaces/IOrganization";
import { serverFetch } from "../fetch";

export function createOrganizationRequest(
  datas: IOrganizationCreate,
  bearer_token: string
) {
  return serverFetch<IOrganization>({
    path: "/organization",
    method: "POST",
    body: datas,
    bearer_token,
  });
}
