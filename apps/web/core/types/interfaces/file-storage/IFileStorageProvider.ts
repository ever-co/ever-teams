import { FileStorageProviderEnum } from '../../enums/file-storage';

// Union type derived from the FileStorageProviderEnum
export type FileStorageProvider = keyof typeof FileStorageProviderEnum | 'DEBUG';
