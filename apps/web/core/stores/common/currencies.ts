import { atom } from 'jotai';
import { ICurrency } from '../../types/interfaces/currencies';

export const currenciesState = atom<ICurrency[]>([]);
