import { atom } from 'jotai';
import { ICurrency } from '../../core/types/interfaces/currencies';

export const currenciesState = atom<ICurrency[]>([]);
