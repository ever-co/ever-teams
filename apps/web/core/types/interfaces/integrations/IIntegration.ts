import { IIntegrationType } from './IIntegrationType';

export interface IIntegration {
	id: string;
	createdAt: string;
	updatedAt: string;
	name: string;
	provider: string;
	redirectUrl: string;
	imgSrc: string;
	isComingSoon: boolean;
	isPaid: boolean;
	version: string | null;
	docUrl: string | null;
	isFreeTrial: boolean;
	freeTrialPeriod: number;
	order: number;
	integrationTypes: IIntegrationType[];
	fullImgUrl: string;
}
