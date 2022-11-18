import { IInviteRequest } from "@app/interfaces/IInvite";
import api from "../axios";

export function inviteByEmailsAPI(data: IInviteRequest) {
  return api.post("/invite/emails", data);
}
