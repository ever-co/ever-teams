import { Menu } from 'electron';
import { IMenu, IMenuItem } from './menu.model';

export class BaseMenu<T extends IMenuItem[]> implements IMenu {
	private _template: T;

	constructor(template: T) {
		this._template = template;
	}

	public build(): void {
		const menu = Menu.buildFromTemplate(this.template);
		Menu.setApplicationMenu(menu);
	}

	public get template(): T {
		return this._template;
	}

	public set template(value: T) {
		this._template = value;
	}
}
