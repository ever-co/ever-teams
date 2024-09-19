import { IIconGeneratorBase } from '../interfaces/i-icon-generator-base';
import * as fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { env } from '../../env';
import * as path from 'path';
import { DesktopEnvironmentManager } from '../../electron-desktop-environment/desktop-environment-manager';

const argv: any = yargs(hideBin(process.argv)).argv;
export class DesktopDefaultIconGenerator implements IIconGeneratorBase {
	private readonly desktop: string;
	private readonly destination: string;
	private readonly source: string;

	constructor() {
		this.desktop = String(argv.desktop);
		this.destination = path.join('apps', this.desktop, 'assets');
		this.source = path.join('.scripts', 'icon-utils', 'icons');
	}

	public async generate(): Promise<void> {
		await new Promise((resolve, reject) =>
			fs.cp(
				this.source,
				this.destination,
				{ recursive: true },
				(error) => {
					if (error) {
						console.error(
							'ERROR: An error occurred while generating the files:',
							error
						);
						reject(error);
						return;
					}
					DesktopEnvironmentManager.environment.DESKTOP_SERVER_WEB_APP_DESKTOP_APP_LOGO_512X512 =
						env.DESKTOP_SERVER_WEB_APP_DESKTOP_APP_LOGO_512X512;
					DesktopEnvironmentManager.environment.PLATFORM_LOGO =
						env.PLATFORM_LOGO;
					console.log('✔ default icons generated successfully!');
					resolve(true);
				}
			)
		);
	}
}
