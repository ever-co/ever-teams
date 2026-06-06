import { clarity } from 'clarity-js';
import { ITeamsConfig } from '../types';
import { createTeamsConfig } from './config';
import { validateConfig } from '../helpers/validate-config';

const tracker = {
	start: (config: ITeamsConfig) => {
		try {
			validateConfig(config);
			const DEFAULT_CONFIG = createTeamsConfig(config);
			clarity.start(DEFAULT_CONFIG);
		} catch (error) {
			throw new Error(`Failed to start tracker: ${error}`);
		}
	},
	stop: () => {
		clarity.stop();
	},
	pause: () => {
		clarity.pause();
	},
	resume: () => {
		clarity.resume();
	}
};

export { tracker };
