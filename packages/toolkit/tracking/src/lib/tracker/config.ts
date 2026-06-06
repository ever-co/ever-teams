import { Config } from 'clarity-js/types/core';
import { ITeamsConfig } from '../types';
import { createUploader } from '../upload/uploader';

export const createTeamsConfig = (config: ITeamsConfig): Config => ({
	upload: createUploader(config),
	delay: config.delay ?? 300000 // Default to 5 minutes (300,000 ms) if not provided
});
