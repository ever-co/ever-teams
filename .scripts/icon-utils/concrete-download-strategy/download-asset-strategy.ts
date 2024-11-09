import { IDownloadStrategy } from '../interfaces/i-download-strategy';
import * as fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as path from 'path';

const argv: any = yargs(hideBin(process.argv)).argv;

export class DownloadAssetStrategy implements IDownloadStrategy {
	private readonly desktop = String(argv.desktop);

	private checkImageExistence(imagePath: string): boolean {
		try {
			fs.accessSync(imagePath);
			return true;
		} catch (error) {
			return false;
		}
	}

	public download(assetPath: string): Promise<string> | string | undefined | null {
		const filePath = path.join('apps', this.desktop, 'src', assetPath);
		if (this.checkImageExistence(filePath)) {
			return filePath;
		}
		console.warn(`WARNING️: This asset ${filePath} do not exist.`);
		return null;
	}
}
