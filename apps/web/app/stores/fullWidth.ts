import { atom } from 'recoil';

export const fullWidthState = atom<boolean>({
	key: 'fullWidth',
	default: true
});
