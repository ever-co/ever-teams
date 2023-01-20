import { ITimezoneItemList } from "@app/interfaces/IUserData";
import { atom, selector } from "recoil";

export const timezoneListState = atom<ITimezoneItemList[]>({
    key: "timezoneListState",
    default: [],
  });
  
  export const activeTimezoneIdState = atom<string | null>({
    key: "activeTimezoneIdState",
    default: null,
  });

export const timezonesFetchingState = atom<boolean>({
    key: "timezonesFetchingState",
    default: false,
});

export const activeTimezoneState = selector<ITimezoneItemList | null>({
    key: "activeTimezoneState",
    get: ({ get }) => {
      const timezones = get(timezoneListState);
      const activeId = get(activeTimezoneIdState);
      return timezones.find((timezone) => timezone.id === activeId) || timezones[0] || null;
    },
  });