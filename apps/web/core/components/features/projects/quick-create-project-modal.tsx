import { Button, Modal, Text } from '@/core/components';
import { useOrganizationProjects } from '@/core/hooks';
import { useCurrentTeam } from '@/core/hooks/organizations/teams/use-current-team';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { isTeamManagerState } from '@/core/stores';
import { TOrganizationProject } from '@/core/types/schemas';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { EverCard } from '../../common/ever-card';
import { InputField } from '../../duplicated-components/_input';

interface IQuickCreateProjectModalProps {
	open: boolean;
	closeModal: () => void;
	onSuccess?: (project: TOrganizationProject) => void;
}
/**
 * A modal that allow to create a new project
 *
 * Quick Create automatically:
 * - Assigns the activeTeam to the project
 * - Assigns the connected user as a member
 * - If the user is a manager, also assigns them as manager
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 *
 * @returns {JSX.Element} The modal element
 */
export function QuickCreateProjectModal(props: IQuickCreateProjectModalProps) {
	const t = useTranslations();
	const { open, closeModal, onSuccess } = props;
	const { createOrganizationProject, createOrganizationProjectLoading } = useOrganizationProjects();
	const [name, setName] = useState('');

	// Get active team and current user info
	const activeTeam = useCurrentTeam();
	const isTeamManager = useAtomValue(isTeamManagerState);
	const { data: user } = useUserQuery();

	// Cleanup
	useEffect(() => {
		return () => {
			setName('');
		};
	}, []);

	const handleCreateProject = useCallback(async () => {
		try {
			if (name.trim() === '') {
				return;
			}

			// Get the current employee ID
			const employeeId = user?.employee?.id || user?.employeeId;

			// Build project creation data with auto-assignment
			const projectData: Parameters<typeof createOrganizationProject>[0] = {
				name,
				// Auto-assign to activeTeam if available
				teams: activeTeam ? [activeTeam] : [],
				// Auto-assign current user as member if employee ID is available
				memberIds: employeeId ? [employeeId] : [],
				// Auto-assign current user as manager if they are a team manager
				managerIds: isTeamManager && employeeId ? [employeeId] : []
			};

			const data = await createOrganizationProject(projectData);

			if (data) {
				onSuccess?.(data);
			}

			closeModal();
		} catch (error) {
			console.error(error);
		}
	}, [closeModal, createOrganizationProject, name, onSuccess, activeTeam, isTeamManager, user]);

	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<EverCard className=" sm:w-[33rem] w-[20rem]" shadow="custom">
				<div className="flex flex-col items-center justify-between gap-8">
					<Text.Heading as="h3" className="text-center">
						{t('common.CREATE_PROJECT')}
					</Text.Heading>

					<div className="w-full">
						<InputField
							name="name"
							autoCustomFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={'Please enter the project name'}
							required
							className="w-full"
							wrapperClassName=" h-full border border-blue-500"
							noWrapper
						/>
					</div>

					<div className="flex items-center justify-between w-full">
						<Button
							disabled={createOrganizationProjectLoading}
							onClick={closeModal}
							className="h-[2.75rem]"
							variant="outline"
						>
							{t('common.CANCEL')}
						</Button>
						<Button
							disabled={createOrganizationProjectLoading}
							loading={createOrganizationProjectLoading}
							className="h-[2.75rem]"
							type="submit"
							onClick={handleCreateProject}
						>
							{t('common.CREATE')}
						</Button>
					</div>
				</div>
			</EverCard>
		</Modal>
	);
}
