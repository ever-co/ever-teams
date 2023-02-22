import { atom, selector } from 'recoil';

export const publicState = atom<boolean>({
	key: 'publicState',
	default: false,
});

export const getPublicState = selector<boolean>({
	key: 'getPublicState',
	get: ({ get }) => {
		return get(publicState);
	},
});
