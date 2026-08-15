import { IUser } from '../atoms/interfaces';

export interface IMember {
	id: string;
	isActive: boolean;
	short_description: string | null;
	description: string | null;
	startedWorkOn: string | null;
	endWork: string | null;
	billRateValue: number;
	minimumBillingRate: number;
	billRateCurrency: string | null;
	averageIncome: string | null;
	averageBonus: any;
	averageExpenses: any;
	isTrackingEnabled: boolean;
	isOnline: boolean;
	isAway: boolean;
	userId: string | null;
	user: IUser;
	fullName: string;
}
