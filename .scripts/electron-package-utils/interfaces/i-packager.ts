import { IPackage } from './i-package';
import { IPackageBuild } from './i-package-build';
export interface IPackager {
	prepare(pkg: IPackage): IPackage;
	prepareBuild(pkg: IPackageBuild): IPackageBuild;
}
