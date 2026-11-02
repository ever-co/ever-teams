import qs from 'qs';
import type {
	TEntityFileLink,
	TEntityFileLinkMetadata,
	TEntityFileLinks,
	TEntityFileOwner,
	TFileDownload,
	TUploadedDocuments
} from '@/core/types/schemas/documents/entity-file.schema';
import { serverFetch } from '../fetch';

interface IGauzyCall {
	bearer_token: string;
	tenantId: string;
}

interface IEntityFileScope extends IGauzyCall {
	organizationId: string;
}

export function getEntityFileLinksRequest({
	entity,
	entityId,
	organizationId,
	bearer_token,
	tenantId
}: IEntityFileScope & { entity: TEntityFileOwner; entityId: string }) {
	const query = qs.stringify({ entity, entityId, organizationId });
	return serverFetch<TEntityFileLinks>({
		path: `/plugins/docs/links?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function createEntityFileLinkRequest({
	documentId,
	entity,
	entityId,
	metadata,
	organizationId,
	bearer_token,
	tenantId
}: IEntityFileScope & {
	documentId: string;
	entity: TEntityFileOwner;
	entityId: string;
	metadata?: TEntityFileLinkMetadata;
}) {
	return serverFetch<TEntityFileLink>({
		path: '/plugins/docs/links',
		method: 'POST',
		body: { documentId, entity, entityId, metadata, tenantId, organizationId },
		bearer_token,
		tenantId
	});
}

export function deleteEntityFileLinkRequest({ id, bearer_token, tenantId }: IGauzyCall & { id: string }) {
	return serverFetch<unknown>({
		path: `/plugins/docs/links/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function uploadDocumentsRequest({ form, bearer_token, tenantId }: IGauzyCall & { form: FormData }) {
	return serverFetch<TUploadedDocuments>({
		path: '/plugins/docs/documents/upload',
		method: 'POST',
		body: form,
		bearer_token,
		tenantId
	});
}

export function getDocumentDownloadRequest({ id, bearer_token, tenantId }: IGauzyCall & { id: string }) {
	return serverFetch<TFileDownload>({
		path: `/plugins/docs/documents/${id}/download`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
