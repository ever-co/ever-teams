import { atom } from 'jotai';
import { ICurrency } from '@/core/types/interfaces/currency/currency';

export const currenciesState = atom<ICurrency[]>([]);
