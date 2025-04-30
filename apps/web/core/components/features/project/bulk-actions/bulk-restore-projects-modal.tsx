import { useOrganizationProjects } from '@/core/hooks';
import { Button, Card, Modal, Text } from '@/core/components';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

interface IBulkRestoreProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectIds: string[];
}
/**
 * A modal to confirm the restoration of multiple projects at the same time
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {string} props.projectIds - The project ids to operate on
 *
 * @returns {JSX.Element} The modal element
 */
export function BulkRestoreProjectsModal(props: IBulkRestoreProjectModalProps) {
	const t = useTranslations();
	const { open, closeModal, projectIds = [] } = props;
	const { editOrganizationProject, setOrganizationProjects, organizationProjects, getOrganizationProjects } =
		useOrganizationProjects();
	const [isLoading, setIsLoading] = useState(false);

	const projects = useMemo(
		() => organizationProjects.filter((project) => projectIds.includes(project.id)),
		[organizationProjects, projectIds]
	);

	// Bulk restore projects
	const handleBulkRestoreProjects = useCallback(async () => {
		try {
			setIsLoading(true);

			const res = await Promise.all(
				projectIds.map(async (projectId) => {
					return await editOrganizationProject(projectId, {
						isArchived: false,
						isActive: true,
						archivedAt: null
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
			console.error('Failed to restore projects', error);
		} finally {
			setIsLoading(false);
		}
	}, [closeModal, editOrganizationProject, getOrganizationProjects, projectIds, setOrganizationProjects]);

	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<Card className=" sm:w-[33rem] w-[20rem]" shadow="custom">
				<div className="w-full text-primary py-3 flex items-center justify-center">
					<RotateCcw size={45} />
				</div>

				<div className="flex flex-col items-center justify-between gap-5">
					<Text.Heading as="h3" className="text-center">
						{t('pages.projects.bulkActions.bulkRestoreModal.title', { projectsCount: projects.length })}
					</Text.Heading>

					<div className="w-full flex flex-col items-center gap-1">
						<p className=" text-center text-[1rem] text-gray-600">
							{t('pages.projects.bulkActions.bulkRestoreModal.description')}:
						</p>

						<p className=" font-medium">{projects.map((el) => el?.name ?? '-').join(', ')}</p>
					</div>

					<div className="flex items-center justify-between w-full">
						<Button disabled={isLoading} onClick={closeModal} className="h-[2.75rem]" variant="outline">
							{t('common.CANCEL')}
						</Button>
						<Button
							onClick={handleBulkRestoreProjects}
							loading={isLoading}
							disabled={isLoading}
							className="h-[2.75rem] bg-primary text-primary-foreground"
						>
							{t('common.RESTORE')}
						</Button>
					</div>
				</div>
			</Card>
		</Modal>
	);
}
