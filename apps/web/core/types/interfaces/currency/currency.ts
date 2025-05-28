import { IBaseEntity } from '../global/base-interfaces';

export interface ICurrency extends IBaseEntity {
	isoCode: string;
	currency: string;
}
