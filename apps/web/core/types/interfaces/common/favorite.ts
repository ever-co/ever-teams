import { IBasePerEntityType } from './base-interfaces';
import { IRelationalEmployee } from '../organization/employee';

export interface IFavorite extends IRelationalEmployee, IBasePerEntityType {}

export interface IFavoriteCreateRequest extends Omit<IFavorite, 'id'> {}
