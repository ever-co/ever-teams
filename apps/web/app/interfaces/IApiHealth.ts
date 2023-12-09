export interface IApiHealth {
	status: string;
	info: { database: { status: string } };
	error: any;
	details: { database: { status: string } };
}
