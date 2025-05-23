import * as fs from 'fs';
import * as path from 'path';
import { IconGenerator } from '../interfaces/icon-generator';
import { IIconGenerator } from '../interfaces/i-icon-generator';
import { env } from '../../env';
import { DesktopEnvironmentManager } from '../../electron-desktop-environment/desktop-environment-manager';

export class PlatformLogoGenerator
	extends IconGenerator
	implements IIconGenerator {
	constructor() {
		super();
		this.imageUrl = env.PLATFORM_LOGO;
		this.destination = path.join(
			'apps',
			this.desktop,
			'src',
			'resources',
			'icons'
		);
	}

	public async resizeAndConvert(filePath: string): Promise<void> {
		const extName = path.extname(this.imageUrl);
		console.log('✔ Resizing and converting platform logo...', extName);
		const platformLogoFilePath = path.join(
			this.destination,
			`platform-logo${extName}`
		);
		await new Promise((resolve, reject) =>
			fs.copyFile(filePath, platformLogoFilePath, async (err) => {
				if (err) {
					console.error(
						'An error occurred while generating the files:',
						err
					);
					reject(err);
					return;
				}
				// load image from assets
				DesktopEnvironmentManager.environment.PLATFORM_LOGO = `../../../resources/icons/platform-logo${extName}`;
				// remove downloaded file
				await this.remove(filePath);
				console.log(`✔ ${extName} copied successfully.`);
				resolve(true);
			})
		);
	}
}
