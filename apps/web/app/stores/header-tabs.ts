import { IssuesView } from '@app/constants';
import { atom } from 'recoil';

export const headerTabs = atom<IssuesView>({
	key: 'headerTabs',
	default: IssuesView.CARDS
});

export const allTeamsHeaderTabs = atom<IssuesView>({
	key: 'allTeamsHeaderTabs',
	default: IssuesView.CARDS
});

export const dailyPlanViewaHeaderTabs = atom<IssuesView>({
	key: 'dailyPlanViewaHeaderTabs',
	default: IssuesView.CARDS
});
