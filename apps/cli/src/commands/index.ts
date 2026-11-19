import { Command } from '../command.js';
import { loginCommand } from './login.js';
import { logoutCommand } from './logout.js';

/** The commands, in the order the help lists them. */
export const COMMANDS: Command[] = [loginCommand, logoutCommand];
