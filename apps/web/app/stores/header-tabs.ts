import { IssuesView } from '@app/constants';
import { atom } from 'jotai';

export const headerTabs = atom<IssuesView>(IssuesView.CARDS);

export const allTeamsHeaderTabs = atom<IssuesView>(IssuesView.CARDS);

export const dailyPlanViewHeaderTabs = atom<IssuesView>(IssuesView.CARDS);
