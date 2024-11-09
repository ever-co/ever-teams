import * as fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as path from 'path';
import { IPackage } from './interfaces/i-package';
import { PackagerFactory } from './packager-factory';
import { IPackageBuild } from './interfaces/i-package-build';

const argv: any = yargs(hideBin(process.argv)).argv;

export class PackageUtil {
	private static _instance: PackageUtil;
	private readonly filePath: string;
	private readonly desktop: string;
	private readonly buildFilePath: string;

	constructor() {
		this.desktop = String(argv.desktop);
		this.filePath = path.join('apps', this.desktop, 'package.json');
		this.buildFilePath = path.join('apps', this.desktop, 'release', 'app', 'package.json');
	}

	private static get instance(): PackageUtil {
		if (!this._instance) {
			this._instance = new PackageUtil();
		}
		return this._instance;
	}

	public static get package(): IPackage | null {
		if (fs.existsSync(this.instance.filePath)) {
			return JSON.parse(
				fs.readFileSync(this.instance.filePath, { encoding: 'utf8' })
			);
		}
		console.warn(`WARNING: File ${this.instance.filePath} doesn't exists.`);
		return null;
	}

	public static get packageBuild(): IPackageBuild | null {
		if (fs.existsSync(this.instance.buildFilePath)) {
			return JSON.parse(
				fs.readFileSync(this.instance.buildFilePath, { encoding: 'utf8' })
			)
		}
		return null;
	}

	public static update(): void {
		const pkg = this.package;
		const pkgBuild = this.packageBuild;
		if (pkg) {
			const packager = PackagerFactory.packager(this.instance.desktop);
			const packed = packager?.prepare(pkg);

			fs.writeFileSync(
				this.instance.filePath,
				JSON.stringify(packed, null, 4)
			);
			console.warn('✔ package updated.');
		}
		if (pkgBuild) {
			const packager = PackagerFactory.packager(this.instance.desktop);
			const packed = packager?.prepareBuild(pkgBuild);
			fs.writeFileSync(
				this.instance.buildFilePath,
				JSON.stringify(packed, null, 4)
			)
			console.warn('✔ package build updated.');
			return;
		}


		console.warn('WARNING: Package not updated.');
	}
}

// Update package.json
PackageUtil.update();
