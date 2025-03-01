import { atom } from 'jotai';
import { ICurrency } from '../interfaces/currencies';

export const currenciesState = atom<ICurrency[]>([]);
