import { IBaseEntityModel } from '../global/base-interfaces';

export interface ICurrency extends IBaseEntityModel {
	isoCode: string;
	currency: string;
}
