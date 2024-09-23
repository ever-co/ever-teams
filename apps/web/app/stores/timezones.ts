import { atom } from 'jotai';

export const timezoneListState = atom<string[]>([]);

export const activeTimezoneIdState = atom<string | null>(null);

export const timezonesFetchingState = atom<boolean>(false);

export const activeTimezoneState = atom<string | null>((get) => {
  const timezones = get(timezoneListState);
  const activeId = get(activeTimezoneIdState);
  return (
    timezones.find((timezone) => timezone === activeId) || timezones[0] || null
  );
});
