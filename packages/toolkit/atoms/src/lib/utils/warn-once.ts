const warned = new Set<string>();

// One console warning per page for a behavior the kit keeps for compatibility and will drop.
export function warnOnce(key: string, message: string): void {
	if (warned.has(key)) {
		return;
	}
	warned.add(key);
	console.warn(`@ever-teams/atoms: ${message}`);
}
