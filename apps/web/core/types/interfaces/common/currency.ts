import { IBaseEntity } from './base-interfaces';

export interface ICurrency extends IBaseEntity {
	isoCode: string;
	currency: string;
}
