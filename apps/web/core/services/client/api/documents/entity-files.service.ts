import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { validateApiResponse } from '@/core/types/schemas';
import {
	entityFileLinkSchema,
	entityFileLinksSchema,
	fileDownloadSchema,
	uploadedDocumentsSchema,
	type TEntityFileLink,
	type TEntityFileLinkMetadata,
	type TEntityFileLinks,
	type TEntityFileOwner,
	type TUploadedDocuments
} from '@/core/types/schemas/documents/entity-file.schema';

export interface IEntityFileTarget {
	entity: TEntityFileOwner;
	entityId: string;
}

/**
 * Files attached to a task, a project or a comment, through Gauzy's Documents plugin: a file is uploaded once as a
 * document of the organization, then linked to the record. Removing it from the record unlinks it; the document
 * itself stays in the organization's documents.
 */
class EntityFilesService extends APIService {
	listFiles = async (target: IEntityFileTarget, signal?: AbortSignal): Promise<TEntityFileLinks> => {
		const query = qs.stringify({
			entity: target.entity,
			entityId: target.entityId,
			organizationId: this.organizationId
		});
		const response = await this.get<TEntityFileLinks>(`/plugins/docs/links?${query}`, { signal });

		return validateApiResponse(entityFileLinksSchema, response.data, 'listFiles API response');
	};

	uploadFiles = async (files: File[]): Promise<TUploadedDocuments> => {
		const formData = new FormData();
		for (const file of files) {
			formData.append('files', file);
		}
		formData.append('tenantId', this.tenantId);
		formData.append('organizationId', this.organizationId);
		const response = await this.post<TUploadedDocuments>('/plugins/docs/documents/upload', formData);

		return validateApiResponse(uploadedDocumentsSchema, response.data, 'uploadFiles API response');
	};

	linkFile = async (
		documentId: string,
		target: IEntityFileTarget,
		metadata?: TEntityFileLinkMetadata
	): Promise<TEntityFileLink> => {
		const response = await this.post<TEntityFileLink>('/plugins/docs/links', {
			documentId,
			entity: target.entity,
			entityId: target.entityId,
			metadata,
			tenantId: this.tenantId,
			organizationId: this.organizationId
		});

		return validateApiResponse(entityFileLinkSchema, response.data, 'linkFile API response');
	};

	unlinkFile = async (linkId: string): Promise<void> => {
		await this.delete(`/plugins/docs/links/${linkId}`);
	};

	/** A short-lived address of the stored file, resolved by Gauzy for the caller's storage provider. */
	downloadUrl = async (documentId: string): Promise<string> => {
		const response = await this.get(`/plugins/docs/documents/${documentId}/download`);
		const download = validateApiResponse(fileDownloadSchema, response.data, 'downloadUrl API response');

		return download.url;
	};
}

export const entityFilesService = new EntityFilesService(GAUZY_API_BASE_SERVER_URL.value);
