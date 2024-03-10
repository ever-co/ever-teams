import { MenuItem, app } from 'electron';
import { BaseMenu } from './base-menu';
import { IMenu } from './menu.model';

export class MainMenu implements IMenu {
	private menu: IMenu;

	constructor() {
		this.menu = new BaseMenu<MenuItem[]>(this.template);
		this.build();
	}

	public build(): void {
		this.menu.build();
	}

	private get template(): any[] {
		return [
			{
				label: 'File',
				submenu: [
					{
						label: 'About',
						accelerator: 'CmdOrCtrl+A',
						click: () => {
							// Handle 'New' action
						}
					},
					{
						label: 'Open',
						accelerator: 'CmdOrCtrl+O',
						click: () => {
							// Handle 'Open' action
						}
					},
					{ type: 'separator' },
					{
						label: 'Exit',
						accelerator: 'CmdOrCtrl+Q',
						click: () => {
							app.quit();
						}
					}
				]
			}
		];
	}
}
