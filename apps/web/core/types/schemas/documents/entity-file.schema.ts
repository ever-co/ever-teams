import { z } from 'zod';

/** The record kinds that carry files in the web app; the names are Gauzy's `BaseEntityEnum` values. */
export const ENTITY_FILE_OWNERS = ['Task', 'OrganizationProject', 'Comment'] as const;

export type TEntityFileOwner = (typeof ENTITY_FILE_OWNERS)[number];

/** Gauzy's `DOCS_UPLOAD_MAX_FILES`: one upload request takes at most this many files. */
export const ENTITY_FILES_PER_UPLOAD = 10;

/** Gauzy's default `GAUZY_DOCS_MAX_FILE_SIZE` (50 MB); the server still decides, per file. */
export const ENTITY_FILE_MAX_BYTES = 50 * 1024 * 1024;

/** The list-safe columns Gauzy returns for a linked document. */
export const entityFileDocumentSchema = z.looseObject({
	id: z.string(),
	name: z.string().nullish(),
	kind: z.string().nullish(),
	mimeType: z.string().nullish(),
	fileSize: z.coerce.number().nullish(),
	originalFilename: z.string().nullish(),
	createdAt: z.string().nullish(),
	createdByUserId: z.string().nullish()
});

export const entityFileLinkSchema = z.looseObject({
	id: z.string(),
	documentId: z.string(),
	entity: z.string(),
	entityId: z.string(),
	createdAt: z.string().nullish(),
	metadata: z.unknown().optional(),
	document: entityFileDocumentSchema.nullish()
});

export const entityFileLinksSchema = z.looseObject({
	items: z.array(entityFileLinkSchema),
	total: z.number()
});

export const uploadedDocumentsSchema = z.looseObject({
	results: z.array(
		z.looseObject({
			document: entityFileDocumentSchema,
			duplicateOfId: z.string().nullish()
		})
	),
	rejected: z.array(
		z.looseObject({
			fileName: z.string(),
			code: z.string(),
			message: z.string()
		})
	)
});

export const fileDownloadSchema = z.looseObject({
	url: z.string()
});

/** A file posted with a comment is also linked to the task, marked with the comment it belongs to. */
export const entityFileLinkMetadataSchema = z.object({
	commentId: z.guid()
});

/** What the proxy accepts when it links a document; tenant and organization come from the session. */
export const createEntityFileLinkSchema = z.object({
	documentId: z.guid(),
	entity: z.enum(ENTITY_FILE_OWNERS),
	entityId: z.guid(),
	metadata: entityFileLinkMetadataSchema.optional()
});

export const entityFileLinksQuerySchema = z.object({
	entity: z.enum(ENTITY_FILE_OWNERS),
	entityId: z.guid()
});

export type TEntityFileDocument = z.infer<typeof entityFileDocumentSchema>;
export type TEntityFileLink = z.infer<typeof entityFileLinkSchema>;
export type TEntityFileLinks = z.infer<typeof entityFileLinksSchema>;
export type TUploadedDocuments = z.infer<typeof uploadedDocumentsSchema>;
export type TFileDownload = z.infer<typeof fileDownloadSchema>;
export type TEntityFileLinkMetadata = z.infer<typeof entityFileLinkMetadataSchema>;
