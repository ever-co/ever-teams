import {
  IOrganization,
  IOrganizationCreate,
} from "@app/interfaces/IOrganization";
import { serverFetch } from "../fetch";

export function createOrganizationRequest(
  datas: IOrganizationCreate,
  bearer_token: string
) {
  return serverFetch<IOrganization>(
    "/organization",
    "POST",
    datas,
    bearer_token
  );
}
