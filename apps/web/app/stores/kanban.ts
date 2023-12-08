import { IKanban } from "@app/interfaces/IKanban";
import { atom } from "recoil";

export const kanbanBoardState = atom<IKanban>({
    key: 'kanbanBoardState',
    default: {}
})