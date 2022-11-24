import { ITimerData, ITimerStatus } from "@app/interfaces/ITimer";
import { atom } from "recoil";

export const timerStatusState = atom<ITimerStatus | null>({
  key: "timerStatusState",
  default: null,
});

export const timerDataState = atom<ITimerData>({
  key: "timerDataState",
  default: { ms: 0, s: 0, m: 0, h: 0 },
});

export const intervState = atom<any>({
  key: "intervState",
  default: null,
});

export const runningStatusStateBiss = atom<boolean>({
  key: "runningStatusStateBiss",
  default: false,
});
