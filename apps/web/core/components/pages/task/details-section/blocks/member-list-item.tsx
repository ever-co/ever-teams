'use client';

import { memo } from 'react';
import { clsxm } from '@/core/lib/utils';
import { SpinnerLoader } from '@/core/components/common/loader';
import { TrashIcon } from 'assets/svg';
import ProfileInfo from '../components/profile-info';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

interface MemberListItemProps {
	member: TOrganizationTeamEmployee;
	isLoading: boolean;
	loadingType: 'assign' | 'unassign' | null;
	onAction: (member: TOrganizationTeamEmployee) => void;
	actionType: 'assign' | 'unassign';
	onClose?: () => void;
}

/**
 * Optimized member list item component with loading states
 * Memoized to prevent unnecessary re-renders
 */
export const MemberListItem = memo<MemberListItemProps>(
	({ member, isLoading, loadingType, onAction, actionType, onClose }) => {
		const isCurrentlyLoading = isLoading && loadingType === actionType;

		const handleClick = () => {
			if (isCurrentlyLoading) return;

			onAction(member);
			onClose?.();
		};

		return (
			<div
				className={clsxm(
					'flex gap-1 justify-between items-center w-auto h-8 transition-opacity duration-200',
					!isCurrentlyLoading && 'hover:cursor-pointer hover:brightness-95 dark:hover:brightness-105',
					isCurrentlyLoading && 'opacity-50 cursor-not-allowed'
				)}
				onClick={handleClick}
			>
				<ProfileInfo profilePicSrc={member.employee?.user?.imageUrl} names={member.employee?.fullName} />

				{/* Loading indicator or action icon */}
				{isCurrentlyLoading ? (
					<SpinnerLoader size={16} />
				) : actionType === 'unassign' ? (
					<TrashIcon className="w-5" />
				) : null}
			</div>
		);
	}
);

MemberListItem.displayName = 'MemberListItem';
