import { useOrganizationProjects } from '@/core/hooks';
import { useAtomValue } from 'jotai';
import { Button, Modal, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import { EverCard } from '@/core/components/common/ever-card';
import { organizationProjectsState } from '@/core/stores';

interface IBulkArchiveProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectIds: string[];
}
/**
 * A modal to archive multiple projects at the same time.
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {string} props.projectIds - The project ids to operate on
 *
 * @returns {JSX.Element} The modal element
 */
export function BulkArchiveProjectsModal(props: IBulkArchiveProjectModalProps) {
	const t = useTranslations();
	const { open, closeModal, projectIds = [] } = props;
	const organizationProjects = useAtomValue(organizationProjectsState);

	const { setOrganizationProjects, editOrganizationProject, getOrganizationProjects } = useOrganizationProjects();
	const [isLoading, setIsLoading] = useState(false);

	const projects = useMemo(
		() => organizationProjects.filter((project) => projectIds.includes(project.id)),
		[organizationProjects, projectIds]
	);

	// Bulk archive projects
	const handleBulkArchiveProjects = useCallback(async () => {
		try {
			setIsLoading(true);

			const res = await Promise.all(
				projectIds.map(async (projectId) => {
					return await editOrganizationProject(projectId, {
						isArchived: true,
						isActive: false,
						archivedAt: moment(Date.now()).format()
					});
				})
			);

			if (res) {
				const updatedProjects = await getOrganizationProjects();

				if (updatedProjects?.items) {
					closeModal();
					setOrganizationProjects(updatedProjects?.items);
				}
			}
		} catch (error) {
			console.error('Failed to archive projects', error);
		} finally {
			setIsLoading(false);
		}
	}, [closeModal, editOrganizationProject, getOrganizationProjects, projectIds, setOrganizationProjects]);

	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<EverCard className=" sm:w-[28rem] w-[16rem]" shadow="custom">
				<div className="flex flex-col gap-8 justify-between items-center">
					<Text.Heading as="h3" className="text-center">
						{t('pages.projects.bulkActions.bulkArchiveModal.title', { projectsCount: projects.length })}
					</Text.Heading>

					<div className="flex flex-col gap-1 items-center w-full">
						<p className=" text-center text-[1rem] text-gray-600">
							{t('pages.projects.bulkActions.bulkArchiveModal.description')}:
						</p>

						<p className="font-medium">{projects.map((el) => el?.name ?? '-').join(', ')}</p>
					</div>

					<div className="flex gap-3 justify-between items-center w-full">
						<Button
							disabled={isLoading}
							onClick={closeModal}
							className="h-[2.75rem] flex-1"
							variant="outline"
						>
							{t('common.CANCEL')}
						</Button>
						<Button
							loading={isLoading}
							disabled={isLoading}
							onClick={handleBulkArchiveProjects}
							className="h-[2.75rem] flex-1 bg-red-600"
							type="submit"
						>
							{t('common.ARCHIVE')}
						</Button>
					</div>
				</div>
			</EverCard>
		</Modal>
	);
}
