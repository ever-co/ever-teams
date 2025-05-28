import { IBaseEntity } from '../common/base-interfaces';

export interface ICurrency extends IBaseEntity {
	isoCode: string;
	currency: string;
}
