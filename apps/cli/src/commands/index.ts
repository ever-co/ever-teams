import { Command } from '../command.js';
import { exportCommand } from './export.js';
import { logCommand } from './log.js';
import { loginCommand } from './login.js';
import { logoutCommand } from './logout.js';
import { projectsCommand } from './projects.js';
import { startCommand } from './start.js';
import { statusCommand } from './status.js';
import { stopCommand } from './stop.js';
import { todayCommand } from './today.js';

/** The commands, in the order the help lists them. */
export const COMMANDS: Command[] = [
	statusCommand,
	startCommand,
	stopCommand,
	todayCommand,
	logCommand,
	exportCommand,
	projectsCommand,
	loginCommand,
	logoutCommand
];
