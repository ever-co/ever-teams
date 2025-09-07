'use client';

import { memo } from 'react';
import { MemberListItem } from './member-list-item';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

interface MemberSectionProps {
	title: string;
	members: TOrganizationTeamEmployee[];
	onAction: (member: TOrganizationTeamEmployee) => void;
	actionType: 'assign' | 'unassign';
	onClose?: () => void;
	emptyMessage?: string;
	// Helper functions for safe loading state access (preferred over direct loadingStates)
	isLoading?: (employeeId: string, action?: 'assign' | 'unassign') => boolean;
	getLoadingState?: (employeeId: string) => 'assign' | 'unassign' | null;
	// Deprecated: kept for backward compatibility, use helper functions instead
	loadingStates?: Record<string, 'assign' | 'unassign' | null>;
}

/**
 * Reusable member section component for both assigned and unassigned members
 * Handles empty states and loading management
 */
export const MemberSection = memo<MemberSectionProps>(
	({ title, members, onAction, actionType, onClose, emptyMessage, isLoading, getLoadingState }) => {
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
					{members.map((member) => {
						// Use helper functions for safe loading state access
						const employeeId = member.employeeId!;
						const memberIsLoading = isLoading ? isLoading(employeeId) : false;
						const memberLoadingType = getLoadingState ? getLoadingState(employeeId) : null;

						return (
							<MemberListItem
								key={`${employeeId}-${actionType}`}
								member={member}
								isLoading={memberIsLoading}
								loadingType={memberLoadingType}
								onAction={onAction}
								actionType={actionType}
								onClose={onClose}
							/>
						);
					})}
				</div>
			</div>
		);
	}
);

MemberSection.displayName = 'MemberSection';
