import { AxiosError } from 'axios';

import { extractHttpCode } from '@/core/lib/utils';
import { ApiErrorResponse } from '@/core/types/generics';

type AxiosErrorInfo = {
	label: string;
	description: string;
	httpCode?: number;
};

export const AxiosErrorStatus: Record<string, number> = {
	ERR_FR_TOO_MANY_REDIRECTS: 310,
	ERR_BAD_OPTION_VALUE: 500,
	ERR_BAD_OPTION: 500,
	ERR_NETWORK: 503,
	ERR_DEPRECATED: 426,
	ERR_BAD_RESPONSE: 502,
	ERR_BAD_REQUEST: 400,
	ERR_NOT_SUPPORT: 501,
	ERR_INVALID_URL: 400,
	ERR_CANCELED: 499,
	ECONNABORTED: 408,
	ETIMEDOUT: 504
};
export const AxiosErrorDetails: Record<string, AxiosErrorInfo> = {
	ERR_FR_TOO_MANY_REDIRECTS: {
		label: 'Too many redirects',
		description: 'The client has followed too many redirects.',
		httpCode: 310
	},
	ERR_BAD_OPTION_VALUE: {
		label: 'Option Value is invalid',
		description: 'The value provided in the Axios configuration is invalid.',
		httpCode: 500 // Internal misconfiguration
	},
	ERR_BAD_OPTION: {
		label: 'Invalid Option',
		description: 'The option provided in the Axios configuration is invalid.',
		httpCode: 500 // Internal also, bad client config
	},
	ERR_NETWORK: {
		label: 'Network Error',
		description: 'The network is inaccessible or the request has not reached the server.',
		httpCode: 503 // Service Unavailable (network failure)
	},
	ERR_DEPRECATED: {
		label: 'Deprecated Feature',
		description: 'An obsolete API was used in Axios.',
		httpCode: 426 // Upgrade Required
	},
	ERR_BAD_RESPONSE: {
		label: 'Invalid Response',
		description: 'The server returned an invalid response.',
		httpCode: 502 // Bad Gateway
	},
	ERR_BAD_REQUEST: {
		label: 'Invalid Request',
		description: 'The request sent is invalid.',
		httpCode: 404
	},
	ERR_NOT_SUPPORT: {
		label: 'Not Supported',
		description: 'The feature is not supported in the current environment.',
		httpCode: 501 // Not Implemented
	},
	ERR_INVALID_URL: {
		label: 'Invalid URL',
		description: 'The URL is malformed or inaccessible.',
		httpCode: 400
	},
	ERR_CANCELED: {
		label: 'Request Canceled',
		description: 'The request has been canceled by the client.',
		httpCode: 499 // NGINX custom: Client Closed Request (non standard but useful)
	},
	ECONNABORTED: {
		label: 'Connection Aborted',
		description: 'Timeout or connection interruption.',
		httpCode: 408
	},
	ETIMEDOUT: {
		label: 'Timeout',
		description: 'The server took too long to respond.',
		httpCode: 504
	}
};

/**
 * @description ApiErrorService is a standardized box for transporting all information about an API error.
 * It encapsulates Axios errors in a more usable structure across the project.
 * @author NdekoCode
 * @export
 * @class ApiErrorService
 * @extends {Error}
 */
export class ApiErrorService extends Error {
	/**
	 * @description HTTP status of the error (ex: 404, 500)
	 * @type {number}
	 */
	public statusCode!: number;

	/**
	 * @description Business error code or internal (ex: USER_NOT_FOUND)
	 * @type {string | undefined}
	 */
	private _errorCode?: string;

	/**
	 * @description Additional data useful for debugging or display
	 * @type {Record<string, any> | undefined}
	 */
	private _details?: Record<string, any>;

	/**
	 * @description Timestamp of the error creation
	 * @type {Date}
	 */
	private _timestamp: Date = new Date();

	/**
	 * @description Indicator allowing to identify this class in an `instanceof`
	 * @type {boolean}
	 */
	public readonly isApiError: boolean = true;

	/**
	 * @description Creates a new instance of ApiErrorService from a message and a status.
	 * @param {string} message - The main message of the error (displayed to the user or in logs)
	 * @param {number} statusCode - HTTP code (ex: 404, 500)
	 * @param {string} [errorCode] - Optional business code (ex: USER_NOT_FOUND)
	 * @param {Record<string, any>} [details] - Additional information
	 */
	constructor(message: string, statusCode: number, errorCode?: string, details?: Record<string, any>) {
		super(message);
		this.name = 'ApiError';

		this.setStatusCode(statusCode);
		if (errorCode != null) this._errorCode = errorCode;
		if (details != null) this._details = details;

		Object.setPrototypeOf(this, ApiErrorService.prototype);
	}

	/**
	 * @description Updates the HTTP code if a value is provided (≠ null/undefined)
	 * @param {number | undefined | null} value - The HTTP code to set
	 */
	setStatusCode(value: number | undefined | null) {
		if (value && value >= 0) this.statusCode = value;
	}

	/**
	 * @description Returns the business error code.
	 */
	get errorCode(): string | undefined {
		return this._errorCode;
	}

	/**
	 * @description Updates the business error code if a value is provided
	 */
	set errorCode(value: string | undefined | null) {
		if (value != null) this._errorCode = value;
	}

	/**
	 * @description Returns the details associated with the error.
	 */
	get details(): Record<string, any> | undefined {
		return this._details;
	}

	/**
	 * @description Updates the details if a value is provided
	 */
	set details(value: Record<string, any> | undefined | null) {
		if (value != null) this._details = value;
	}

	/**
	 * @description Returns the date of creation of the error.
	 */
	get timestamp(): Date {
		return this._timestamp;
	}

	/**
	 * @description Updates the creation date if a new date is provided
	 */
	set timestamp(value: Date | undefined | null) {
		if (value != null) this._timestamp = value;
	}

	/**
	 * @description Converts an Axios error into an instance of ApiErrorService with contextual enrichment.
	 * @param error An error originating from an Axios call
	 * @returns A proper instance of ApiErrorService
	 */
	static fromAxiosError<T = any>(error: T | AxiosError<ApiErrorResponse>): ApiErrorService {
		const errorFrom = error as AxiosError<ApiErrorResponse>;
		const response = errorFrom?.response;
		const errorCode = errorFrom?.code || 'ERR_BAD_REQUEST';
		const info = AxiosErrorDetails[errorCode];

		const fallbackMessage = info
			? `Error (${info.label}) – ${info.description} (HTTP ${info.httpCode || 'unknown'})`
			: `Unknown error (${errorCode})`;
		const extractStatus = extractHttpCode(fallbackMessage.trim().split('HTTP')?.[1]) ?? 500;

		const statusCode = AxiosErrorStatus[errorCode] ?? response?.status ?? info?.httpCode ?? extractStatus;
		if (!response) {
			return new ApiErrorService(errorFrom?.message || fallbackMessage, statusCode!);
		}

		// We extract the useful infos from it (message, code, details…)
		const data = response?.data;
		const message = data?.message || fallbackMessage;
		const code = data?.code;
		const details = data?.details;

		// We put them in our ApiError box
		return new ApiErrorService(message, statusCode, code, details);
	}

	/**
	 * @description Checks if a given error is an instance of ApiErrorService
	 */
	static isApiError(error: any): error is ApiErrorService {
		return error && error.isApiError === true;
	}
}
