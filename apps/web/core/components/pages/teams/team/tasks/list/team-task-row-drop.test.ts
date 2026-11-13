import { rowMoveOf, teamTaskRowData } from './team-task-row-drop';

describe('rowMoveOf, a row dropped on another one', () => {
	const source = teamTaskRowData('moved', 'status:todo');

	it('puts the task before the row on its top half, after it on its bottom half', () => {
		const target = teamTaskRowData('target', 'status:todo');
		expect(rowMoveOf(source, target, 'top')).toEqual({ taskId: 'moved', targetId: 'target', edge: 'before' });
		expect(rowMoveOf(source, target, 'bottom')).toEqual({ taskId: 'moved', targetId: 'target', edge: 'after' });
	});

	it('moves nothing onto another group, onto itself, or without an edge', () => {
		expect(rowMoveOf(source, teamTaskRowData('target', 'status:done'), 'top')).toBeNull();
		expect(rowMoveOf(source, teamTaskRowData('moved', 'status:todo'), 'top')).toBeNull();
		expect(rowMoveOf(source, teamTaskRowData('target', 'status:todo'), null)).toBeNull();
		expect(rowMoveOf(source, teamTaskRowData('target', 'status:todo'), 'left')).toBeNull();
	});
});
