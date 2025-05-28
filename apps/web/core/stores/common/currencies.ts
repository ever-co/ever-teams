import { atom } from 'jotai';
import { ICurrency } from '@/core/types/interfaces/common/currency';

export const currenciesState = atom<ICurrency[]>([]);
