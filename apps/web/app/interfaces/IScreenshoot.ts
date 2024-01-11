export interface IScreenshootPerHour {
	startTime: Date | string;
	endTime: Date | string;
}

export interface IScreenShootItem {
	startTime: Date | string;
	endTime: Date | string;
	imageUrl: string;
	percent: number | string;
	showProgress?: boolean;
	onShow: () => any;
}
