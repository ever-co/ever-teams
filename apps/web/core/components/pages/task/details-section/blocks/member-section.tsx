'use client';

import { memo } from 'react';
import { MemberListItem } from './member-list-item';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

interface MemberSectionProps {
	title: string;
	members: TOrganizationTeamEmployee[];
	loadingStates: Record<string, 'assign' | 'unassign' | null>;
	onAction: (member: TOrganizationTeamEmployee) => void;
	actionType: 'assign' | 'unassign';
	onClose?: () => void;
	emptyMessage?: string;
}

/**
 * Reusable member section component for both assigned and unassigned members
 * Handles empty states and loading management
 */
export const MemberSection = memo<MemberSectionProps>(
	({ title, members, loadingStates, onAction, actionType, onClose, emptyMessage }) => {
		if (members.length === 0) {
			return emptyMessage ? (
				<div className="py-2 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</div>
			) : null;
		}

		return (
			<div className="flex flex-col gap-y-2 mb-4">
				<h4 className="text-sm font-medium text-gray-700 whitespace-nowrap dark:text-gray-300 text-nowrap">
					{title} ({members.length})
				</h4>
				<div className="flex flex-col gap-y-1">
					{members.map((member, index) => (
						<MemberListItem
							key={`${member.employeeId}-${actionType}`}
							member={member}
							isLoading={loadingStates[member.employeeId!] !== null}
							loadingType={loadingStates[member.employeeId!]}
							onAction={onAction}
							actionType={actionType}
							onClose={onClose}
						/>
					))}
				</div>
			</div>
		);
	}
);

MemberSection.displayName = 'MemberSection';
