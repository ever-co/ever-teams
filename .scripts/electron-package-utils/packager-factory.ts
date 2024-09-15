import { IPackager } from './interfaces/i-packager';
import { DesktopPackager } from './concrete-packager/desktop-packager';

export class PackagerFactory {
	public static packager(desktop: string): IPackager | undefined {
		switch (desktop) {
			case 'server-web':
				return new DesktopPackager();
			default:
				console.warn('WARNING: Unknown application.');
				break;
		}
	}
}
