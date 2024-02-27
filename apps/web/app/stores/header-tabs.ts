import { IssuesView } from '@app/constants';
import { atom } from 'recoil';

export const headerTabs = atom<IssuesView>({
	key: 'headerTabs',
	default: IssuesView.CARDS
});
