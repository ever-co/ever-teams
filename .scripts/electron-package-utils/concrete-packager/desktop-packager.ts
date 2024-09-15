import { IPackage } from '../interfaces/i-package';
import { IPackager } from '../interfaces/i-packager';
import { IPackageBuild } from '../interfaces/i-package-build';
import { env } from '../../env';

export class DesktopPackager implements IPackager {
	public prepare(pkg: IPackage): IPackage {
		pkg.name = env.DESKTOP_SERVER_WEB_APP_NAME || pkg.name;
		pkg.productName = env.DEKSTOP_SERVER_WEB_APP_DESCRIPTION || pkg.productName;
		pkg.description = env.DEKSTOP_SERVER_WEB_APP_DESCRIPTION || pkg.description;
		pkg.homepage = env.COMPANY_SITE_LINK || pkg.homepage;
		pkg.build.appId = env.DESKTOP_SERVER_WEB_APP_ID || pkg.build.appId;
		pkg.build.productName =
			env.DEKSTOP_SERVER_WEB_APP_DESCRIPTION || pkg.build.productName;
		pkg.build.linux.executableName =
			env.DESKTOP_SERVER_WEB_APP_NAME || pkg.build.linux.executableName;
		return pkg;
	}

	public prepareBuild(pkg: IPackageBuild): IPackageBuild {
		pkg.description = env.DEKSTOP_SERVER_WEB_APP_DESCRIPTION || pkg.description;
		pkg.name = env.DESKTOP_SERVER_WEB_APP_NAME || pkg.name;
		return pkg;
	}
}
