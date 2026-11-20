type TeamDangerFacts = {
	isTeamManager: boolean;
	managerCount: number;
	/** The person signed in is a member of the team. */
	isMember: boolean;
};

/** The web's rule for quitting a team: a manager when another manager stays, any other member. */
export function canQuitTeamOf({ isTeamManager, managerCount, isMember }: TeamDangerFacts): boolean {
	if (isTeamManager) {
		return managerCount > 1;
	}
	return isMember;
}
