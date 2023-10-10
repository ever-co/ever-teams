import { atom } from 'recoil';

export const isPermissionModalOpenState = atom<boolean>({
	key: 'isPermissionModalOpen',
	default: false
});
