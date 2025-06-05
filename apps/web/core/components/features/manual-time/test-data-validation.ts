/**
 * Test data to validate the fix for [Object Object] issue in task select
 * This file contains examples of corrupted data that was causing the problem
 */

// Example of corrupted tasks data that was causing [Object Object] to appear
export const corruptedTasksData = [
	// Valid task for Team A
	{
		id: 'task-1',
		title: 'Valid Task 1',
		description: 'This is a valid task',
		members: [],
		teams: [{ id: 'team-a', name: 'Team A' }]
	},
	// Valid task for Team B
	{
		id: 'task-2',
		title: 'Valid Task 2',
		description: 'Another valid task',
		members: [{ id: 'member-1', name: 'John Doe' }],
		teams: [{ id: 'team-b', name: 'Team B' }]
	},
	// Invalid objects that were causing [Object Object]
	{
		hello: 'world',
		teams: 'some value'
	},
	{
		id: 123, // Invalid: should be string
		title: 'Invalid Task'
	},
	{
		id: 'task-invalid',
		title: null // Invalid: should be string
	},
	// String values that shouldn't be in tasks array
	'Hello',
	'Teams',
	// Array that shouldn't be in tasks array
	['nested', 'array'],
	// Valid task for Team A (multiple teams)
	{
		id: 'task-3',
		title: 'Multi-team Task',
		description: 'Task assigned to multiple teams',
		members: [],
		teams: [
			{ id: 'team-a', name: 'Team A' },
			{ id: 'team-c', name: 'Team C' }
		]
	},
	// Task without teams (should be filtered out)
	{
		id: 'task-4',
		title: 'Task Without Teams',
		description: 'This task has no teams',
		members: []
		// Missing teams array
	},
	// Null/undefined values
	null,
	undefined,
	// Empty object
	{},
	// Object with only invalid properties
	{
		randomProp: 'value',
		anotherProp: 123
	}
];

// Expected result after filtering with our validation (all valid tasks)
export const expectedValidTasks = [
	{
		id: 'task-1',
		title: 'Valid Task 1',
		description: 'This is a valid task',
		members: [],
		teams: [{ id: 'team-a', name: 'Team A' }]
	},
	{
		id: 'task-2',
		title: 'Valid Task 2',
		description: 'Another valid task',
		members: [{ id: 'member-1', name: 'John Doe' }],
		teams: [{ id: 'team-b', name: 'Team B' }]
	},
	{
		id: 'task-3',
		title: 'Multi-team Task',
		description: 'Task assigned to multiple teams',
		members: [],
		teams: [
			{ id: 'team-a', name: 'Team A' },
			{ id: 'team-c', name: 'Team C' }
		]
	}
];

// Expected result after filtering by Team A
export const expectedTeamATasks = [
	{
		id: 'task-1',
		title: 'Valid Task 1',
		description: 'This is a valid task',
		members: [],
		teams: [{ id: 'team-a', name: 'Team A' }]
	},
	{
		id: 'task-3',
		title: 'Multi-team Task',
		description: 'Task assigned to multiple teams',
		members: [],
		teams: [
			{ id: 'team-a', name: 'Team A' },
			{ id: 'team-c', name: 'Team C' }
		]
	}
];

// Expected result after filtering by Team B
export const expectedTeamBTasks = [
	{
		id: 'task-2',
		title: 'Valid Task 2',
		description: 'Another valid task',
		members: [{ id: 'member-1', name: 'John Doe' }],
		teams: [{ id: 'team-b', name: 'Team B' }]
	}
];

/**
 * Test function to validate our isValidTask function
 * This can be used in development to test the validation logic
 */
export const testTaskValidation = (isValidTask: (task: any) => boolean) => {
	console.log('🧪 Testing task validation...');

	const validTasks = corruptedTasksData.filter(isValidTask);

	console.log('📊 Validation Results:', {
		originalCount: corruptedTasksData.length,
		validCount: validTasks.length,
		invalidCount: corruptedTasksData.length - validTasks.length,
		validTasks,
		expectedCount: expectedValidTasks.length
	});

	// Check if our validation matches expected results
	const isCorrect = validTasks.length === expectedValidTasks.length;

	if (isCorrect) {
		console.log('✅ Task validation working correctly!');
	} else {
		console.log('❌ Task validation needs adjustment');
		console.log('Expected:', expectedValidTasks.length, 'Got:', validTasks.length);
	}

	return isCorrect;
};

/**
 * Test function to validate user assignment filtering
 */
export const testUserAssignmentFiltering = (
	isTaskAssignedToUser: (task: any, userId: string) => boolean,
	userId: string
) => {
	console.log('🧪 Testing user assignment filtering...');

	// Test data with user assignments
	const tasksWithAssignments = [
		{
			id: 'task-1',
			title: 'Task assigned to user',
			teams: [{ id: 'team-a', name: 'Team A' }],
			members: [
				{ userId: 'user-123', fullName: 'John Doe' },
				{ userId: 'user-456', fullName: 'Jane Smith' }
			]
		},
		{
			id: 'task-2',
			title: 'Task not assigned to user',
			teams: [{ id: 'team-a', name: 'Team A' }],
			members: [
				{ userId: 'user-456', fullName: 'Jane Smith' },
				{ userId: 'user-789', fullName: 'Bob Wilson' }
			]
		},
		{
			id: 'task-3',
			title: 'Task with no members',
			teams: [{ id: 'team-a', name: 'Team A' }],
			members: []
		}
	];

	const userAssignedTasks = tasksWithAssignments.filter((task) => isTaskAssignedToUser(task, userId));

	console.log('📊 User Assignment Results:', {
		totalTasks: tasksWithAssignments.length,
		userAssignedTasks: userAssignedTasks.length,
		userId,
		assignedTaskIds: userAssignedTasks.map((t) => t.id)
	});

	// For userId 'user-123', should only return task-1
	const expectedForUser123 = userId === 'user-123' ? 1 : 0;
	const isCorrect = userAssignedTasks.length === expectedForUser123;

	if (isCorrect) {
		console.log('✅ User assignment filtering working correctly!');
	} else {
		console.log('❌ User assignment filtering needs adjustment');
	}

	return isCorrect;
};

/**
 * Example of how the bug manifested in the UI
 */
export const bugExamples = {
	// What users saw in the dropdown
	displayedOptions: [
		'Valid Task 1',
		'[object Object]', // This was the problem!
		'[object Object]', // Multiple instances
		'Hello', // String values
		'Teams', // More string values
		'Valid Task 2'
	],

	// What should be displayed
	expectedOptions: ['Valid Task 1', 'Valid Task 2']
};

/**
 * Test function to validate team manager role filtering
 */
export const testTeamManagerFiltering = (
	tasks: any[],
	isTeamManager: boolean,
	userId: string,
	isTaskAssignedToUser: (task: any, userId: string) => boolean
) => {
	console.log('🧪 Testing team manager role filtering...');

	// Simulate the filtering logic from the component
	const finalFilteredTasks = isTeamManager ? tasks : tasks.filter((task) => isTaskAssignedToUser(task, userId));

	console.log('📊 Team Manager Filtering Results:', {
		totalTasks: tasks.length,
		isTeamManager,
		userId,
		finalFilteredTasks: finalFilteredTasks.length,
		filteringMode: isTeamManager ? 'ALL_TEAM_TASKS' : 'USER_ASSIGNED_ONLY',
		taskIds: finalFilteredTasks.map((t) => t.id)
	});

	// Validation logic
	if (isTeamManager) {
		// Team manager should see all tasks
		const isCorrect = finalFilteredTasks.length === tasks.length;
		if (isCorrect) {
			console.log('✅ Team manager sees all tasks correctly!');
		} else {
			console.log('❌ Team manager filtering failed');
		}
		return isCorrect;
	} else {
		// Regular user should see only assigned tasks
		const expectedAssignedTasks = tasks.filter((task) => isTaskAssignedToUser(task, userId));
		const isCorrect = finalFilteredTasks.length === expectedAssignedTasks.length;
		if (isCorrect) {
			console.log('✅ Regular user sees only assigned tasks correctly!');
		} else {
			console.log('❌ Regular user filtering failed');
		}
		return isCorrect;
	}
};

/**
 * Role-based filtering examples
 */
export const roleBasedExamples = {
	// Team Manager view
	teamManagerView: {
		user: { id: 'manager-123', role: 'MANAGER' },
		tasksShown: [
			'Task 1 (assigned to John)',
			'Task 2 (assigned to Jane)',
			'Task 3 (assigned to Bob)',
			'Task 4 (unassigned)',
			'Task 5 (assigned to Manager)'
		],
		description: 'Team managers see ALL team tasks'
	},

	// Regular Employee view
	regularEmployeeView: {
		user: { id: 'employee-456', role: 'EMPLOYEE' },
		tasksShown: ['Task 2 (assigned to Jane)'],
		description: 'Regular employees see ONLY their assigned tasks'
	}
};
