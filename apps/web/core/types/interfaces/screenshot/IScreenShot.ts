import { IBasePerTenantAndOrganizationEntityModel, ID } from '../base-interfaces';
import { FileStorageProvider } from '../file-storage/IFileStorageProvider';
import { ITimeSlot } from '../time-slot/ITimeSlot';
import { IRelationalUser } from '../user/IUser';

export interface IScreenshot extends IBasePerTenantAndOrganizationEntityModel, IRelationalUser {
	[x: string]: any;
	file: string;
	thumb?: string;
	fileUrl?: string;
	thumbUrl?: string;
	fullUrl?: string;
	recordedAt?: Date;
	storageProvider?: FileStorageProvider;
	/** Image/Screenshot Analysis Through Gauzy AI */
	isWorkRelated?: boolean;
	description?: string;
	apps?: string | string[];
	/** Relations */
	timeSlot?: ITimeSlot;
	timeSlotId?: ID;
}
export interface IScreenshootPerHour {
	startTime: Date | string;
	endTime: Date | string;
}

export interface IScreenShootItem {
	idSlot: string;
	startTime: Date | string;
	endTime: Date | string;
	imageUrl: string;
	percent: number | string;
	showProgress?: boolean;
	isTeamPage?: boolean;
	onShow: () => any;
	viewMode?: 'default' | 'screenShot-only';
}
