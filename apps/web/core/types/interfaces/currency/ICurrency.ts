import { IBaseEntityModel } from '../base-interfaces';

export interface ICurrency extends IBaseEntityModel {
	isoCode: string;
	currency: string;
}
