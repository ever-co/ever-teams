import { PaginationResponse } from "@app/interfaces/IDataResponse";
import { IInvitation, IInviteRequest } from "@app/interfaces/IInvite";
import api from "../axios";

export function inviteByEmailsAPI(data: IInviteRequest) {
  return api.post<PaginationResponse<IInvitation>>("/invite/emails", data);
}

export function getTeamInvitationsAPI() {
  return api.get<PaginationResponse<IInvitation>>("/invite");
}
