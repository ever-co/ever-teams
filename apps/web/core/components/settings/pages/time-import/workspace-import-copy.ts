import { WORKSPACE_IMPORT_MAX_FILE_BYTES } from '@/core/lib/utils/workspace-import-files';

const BYTES_PER_MEGABYTE = 1024 * 1024;

export const WORKSPACE_IMPORT_MAX_MEGABYTES = WORKSPACE_IMPORT_MAX_FILE_BYTES / BYTES_PER_MEGABYTE;

export const WORKSPACE_IMPORT_ACCEPT = '.csv,.json,.zip,text/csv,application/json,application/zip';
