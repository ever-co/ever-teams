import { IInvitation } from "@app/interfaces/IInvite";
import { atom } from "recoil";

export const teamInvitationsState = atom<IInvitation[]>({
  key: "teamInvitationsState",
  default: [],
});

export const fetchingTeamInvitationsState = atom<boolean>({
  key: "fetchingTeamInvitationsState",
  default: false,
});
