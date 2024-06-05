import { atom } from "recoil";

export const activeSettingTeamTab = atom<string>({
	key: 'activeSettingTeamTab',
	default: ''
});
