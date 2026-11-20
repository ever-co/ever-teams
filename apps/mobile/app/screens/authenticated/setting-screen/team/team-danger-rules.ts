type TeamDangerFacts = {
	isTeamManager: boolean;
	managerCount: number;
	/** The person signed in is a member of the team. */
	isMember: boolean;
};

/** The web's rule for quitting a team: a manager when another manager stays, any other member. */
export function canQuitTeamOf({ isTeamManager, managerCount, isMember }: TeamDangerFacts): boolean {
	// Quitting deletes the person's own membership: without one there is nothing to delete, manager or not
	if (!isMember) {
		return false;
	}
	if (isTeamManager) {
		return managerCount > 1;
	}
	return true;
}
