interface IResponseMetadata {
	status: ResStatusEnum;
	message: string;
	error: Error | null;
}

export type IDataResponse<T = any> = IResponseMetadata & T;

export enum ResStatusEnum {
	error = 'error',
	success = 'success'
}

export type PaginationResponse<T> = {
	items: T[];
	total: number;
};

export type DeleteResponse = {
	raw: string[];
	affected: number;
};

export type CreateResponse<T> = {
	data: T;
	response: any;
};

export type SingleDataResponse<T> = {
	data: T;
};

export interface ISuccessResponse {
	status: number;
	message: string;
}

export type INextParams = { params: Record<string, string | null> };
