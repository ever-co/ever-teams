import { ITimerStatus } from "@app/interfaces/ITimer";
import { atom } from "recoil";

export const timerStatusState = atom<ITimerStatus | null>({
  key: "timerStatusState",
  default: null,
});

export const timerStatusFetchingState = atom<boolean>({
  key: "timerStatusFetchingState",
  default: false,
});

export const timeCounterState = atom<number>({
  key: "timeCounterState",
  default: 0,
});
