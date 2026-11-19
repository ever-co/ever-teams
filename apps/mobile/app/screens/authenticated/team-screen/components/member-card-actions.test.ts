import {
	MemberCardHandlers,
	MemberCardViewer,
	canEditMemberWork,
	memberCardActionsOf,
	showsMemberMenu
} from './member-card-actions';

const handlers: MemberCardHandlers = {
	editTask: jest.fn(),
	editEstimate: jest.fn(),
	assignTask: jest.fn(),
	unassignTask: jest.fn(),
	makeManager: jest.fn(),
	unMakeManager: jest.fn(),
	remove: jest.fn()
};

const label = (key: string) => key;

function viewerWith(overrides: Partial<MemberCardViewer>): MemberCardViewer {
	return {
		isAuthTeamManager: false,
		isAuthUser: false,
		isTeamCreator: false,
		isTeamManager: false,
		isTeamOwner: false,
		hasTask: true,
		hasTasksToAssign: true,
		hasActiveTask: true,
		...overrides
	};
}

function keysOf(viewer: MemberCardViewer): string[] {
	return memberCardActionsOf(viewer, handlers, label).map((action) => action.key);
}

describe("the actions of a member card's sheet", () => {
	it("gives a manager on someone else's card every action of the old menu, in its order", () => {
		const keys = keysOf(viewerWith({ isAuthTeamManager: true }));

		expect(keys).toEqual(['edit-task', 'estimate', 'assign', 'unassign', 'make-manager', 'remove']);
	});

	it('offers to unmake a member who is already a manager', () => {
		const keys = keysOf(viewerWith({ isAuthTeamManager: true, isTeamManager: true }));

		expect(keys).toContain('unmake-manager');
		expect(keys).not.toContain('make-manager');
	});

	it("never offers a role change on one's own card or on the team creator's", () => {
		expect(keysOf(viewerWith({ isAuthTeamManager: true, isAuthUser: true }))).not.toContain('make-manager');
		expect(keysOf(viewerWith({ isAuthTeamManager: true, isTeamCreator: true }))).not.toContain('make-manager');
	});

	it('leaves the task actions to a manager and to the person themselves', () => {
		const own = keysOf(viewerWith({ isAuthUser: true }));
		const someoneElse = keysOf(viewerWith({}));

		expect(own).toEqual(['edit-task', 'estimate', 'assign', 'unassign', 'remove']);
		expect(someoneElse).toEqual(['remove']);
		expect(canEditMemberWork(viewerWith({}))).toBe(false);
	});

	it('drops the actions without a subject: no task, nothing to assign, no active task', () => {
		const keys = keysOf(
			viewerWith({ isAuthUser: true, hasTask: false, hasTasksToAssign: false, hasActiveTask: false })
		);

		expect(keys).toEqual(['remove']);
	});

	it("never offers to remove the team's owner, and marks Remove as destructive", () => {
		const ownerKeys = keysOf(viewerWith({ isAuthTeamManager: true, isTeamOwner: true }));
		const remove = memberCardActionsOf(viewerWith({ isAuthTeamManager: true }), handlers, label).find(
			(action) => action.key === 'remove'
		);

		expect(ownerKeys).not.toContain('remove');
		expect(remove?.destructive).toBe(true);
		expect(remove?.onPress).toBe(handlers.remove);
	});

	it("shows no menu on the owner's own card with no task and none to assign, where it opened empty", () => {
		const viewer = viewerWith({
			isAuthUser: true,
			isTeamOwner: true,
			hasTask: false,
			hasTasksToAssign: false,
			hasActiveTask: false
		});
		const actions = memberCardActionsOf(viewer, handlers, label);

		expect(actions).toEqual([]);
		expect(showsMemberMenu(viewer, actions)).toBe(false);
	});

	it('shows the menu to a manager with actions in it', () => {
		const viewer = viewerWith({ isAuthTeamManager: true });

		expect(showsMemberMenu(viewer, memberCardActionsOf(viewer, handlers, label))).toBe(true);
	});
});
