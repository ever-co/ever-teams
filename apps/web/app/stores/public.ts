import { atom } from 'jotai';

export const publicState = atom<boolean>(false);

export const getPublicState = atom<boolean>((get) => {
  return get(publicState);
});
