import { Command, CommandContext } from '../command.js';
import { removeLogin } from '../config.js';

async function logout(context: CommandContext): Promise<void> {
	const { io, output } = context;
	const removed = removeLogin(io);
	let line = 'You were not signed in: there is no stored token.';
	if (removed) {
		line =
			'Signed out: the stored token is removed. It keeps working until you revoke it in Settings > API tokens.';
	}
	output.result({ signedOut: removed }, [line]);
	if (io.env.EVER_TEAMS_TOKEN) {
		output.note('EVER_TEAMS_TOKEN is still set in this shell, and the command line still uses it.');
	}
}

export const logoutCommand: Command = {
	name: 'logout',
	summary: 'Remove the stored token',
	usage: 'logout',
	description: 'Removes the token login stored. To make the token stop working, revoke it in Settings > API tokens.',
	options: {},
	optionHelp: [],
	examples: ['ever-teams logout'],
	run: logout
};
