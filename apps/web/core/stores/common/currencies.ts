import { atom } from 'jotai';
import { ICurrency } from '@/core/types/interfaces/currency/ICurrency';

export const currenciesState = atom<ICurrency[]>([]);
