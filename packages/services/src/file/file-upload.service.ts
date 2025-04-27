import axios, { CancelTokenSource } from 'axios';
import { APIService } from '../api.service';

/**
 * Service class for handling file uploads within Ever Teams.
 *
 * Supports direct uploads via signed URLs with cancellation support.
 *
 * @class
 * @extends {APIService}
 */
export class FileUploadService extends APIService {
	private cancelSource?: CancelTokenSource;

	/**
	 * Initializes the FileUploadService with an optional base URL.
	 *
	 * @param {string} [baseURL] - Optional API base URL. Defaults to empty for direct signed uploads.
	 */
	constructor(baseURL: string = '') {
		super(baseURL);
	}

	/**
	 * Uploads a file to a specified signed URL.
	 *
	 * @param {string} signedUrl - The signed URL provided for file upload.
	 * @param {FormData} formData - FormData containing the file.
	 * @returns {Promise<void>}
	 * @throws {any} If the upload fails or is cancelled.
	 */
	async uploadFileToSignedUrl(signedUrl: string, formData: FormData): Promise<void> {
		this.cancelSource = axios.CancelToken.source();

		try {
			await axios.post(signedUrl, formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
				cancelToken: this.cancelSource.token,
				withCredentials: false,
			});
		} catch (error: any) {
			if (axios.isCancel(error)) {
				console.warn('Upload cancelled:', error.message);
			} else {
				throw error?.response?.data || error;
			}
		} finally {
			this.cancelSource = undefined; // Clean up after upload
		}
	}

	/**
	 * Cancels an ongoing file upload if it is in progress.
	 */
	cancelUpload(): void {
		if (this.cancelSource) {
			this.cancelSource.cancel('File upload has been cancelled by the user.');
			this.cancelSource = undefined;
		}
	}
}
