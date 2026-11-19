import { Command } from '../command.js';
import { loginCommand } from './login.js';
import { logoutCommand } from './logout.js';
import { projectsCommand } from './projects.js';
import { startCommand } from './start.js';
import { statusCommand } from './status.js';

/** The commands, in the order the help lists them. */
export const COMMANDS: Command[] = [statusCommand, startCommand, projectsCommand, loginCommand, logoutCommand];
