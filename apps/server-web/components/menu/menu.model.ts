import { MenuItem } from 'electron';

export type IMenuItem = MenuItem;

export interface IMenu {
	build(): void;
}
