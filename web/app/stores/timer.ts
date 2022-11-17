import { ITimerStatus } from "@app/interfaces/ITimer";
import { atom } from "recoil";

export const timerStatusState = atom<ITimerStatus | null>({
  key: "timerStatusState",
  default: null,
});
