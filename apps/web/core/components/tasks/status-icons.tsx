import { ITaskStatus } from '@/core/types/interfaces/to-review/ITask';
import React from 'react';
import { ClosedTaskIcon } from '../svgs/closed-task';
import { CompletedTaskIcon } from '../svgs/completed-task';
import { ProgressTaskIcon } from '../svgs/progress-task';
import { TestingTaskIcon } from '../svgs/testing-task';
import { TodoTaskIcon } from '../svgs/todo-task';
import { InReviewTaskIcon } from '../svgs/review-task';
import { UnassignedTaskIcon } from '../svgs/unassigned-task';

export const statusIcons: { [x: string]: React.ReactElement } = {
	Todo: <TodoTaskIcon color="#3D9A6D" background="#28D58133" />,
	'In Progress': <ProgressTaskIcon color="#735EA8" background="#E8EBF8" />,
	'In Review': <InReviewTaskIcon color="#8B7FAA" background="#F5F6FB" />,
	'For Testing': <TestingTaskIcon color="#E1AB2D" background="#CE930B1A" />,
	Completed: <CompletedTaskIcon color="#3D9A6D" background="#CFF3E3" />,
	Closed: <ClosedTaskIcon color="#8F97A1" background="#F2F4F6" />,
	Unassigned: <UnassignedTaskIcon color="#5f5f5f" />
};

export function StatusIcon({ status }: { status: ITaskStatus }) {
	return <>{statusIcons[status] || ''}</>;
}

export function BadgedTaskStatus({ status }: { status: ITaskStatus }) {
	const node = statusIcons[status] as React.ReactElement<{ background?: string; color?: string }>;

	return (
		<div
			style={{
				background: node.props.background || '#F2F4F6',
				color: node.props.color || '#8F97A1'
			}}
			className={`px-2 py-1 rounded-2xl text-xs flex items-center justify-center`}
		>
			{node} {status}
		</div>
	);
}
