import { EFileStorageProvider } from '../../generics/enums/file-storage';

// Union type derived from the FileStorageProviderEnum
export type FileStorageProvider = keyof typeof EFileStorageProvider | 'DEBUG';
