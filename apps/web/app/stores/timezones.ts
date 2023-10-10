import { atom, selector } from 'recoil';

export const timezoneListState = atom<string[]>({
	key: 'timezoneListState',
	default: []
});

export const activeTimezoneIdState = atom<string | null>({
	key: 'activeTimezoneIdState',
	default: null
});

export const timezonesFetchingState = atom<boolean>({
	key: 'timezonesFetchingState',
	default: false
});

export const activeTimezoneState = selector<string | null>({
	key: 'activeTimezoneState',
	get: ({ get }) => {
		const timezones = get(timezoneListState);
		const activeId = get(activeTimezoneIdState);
		return (
			timezones.find((timezone) => timezone === activeId) ||
			timezones[0] ||
			null
		);
	}
});
