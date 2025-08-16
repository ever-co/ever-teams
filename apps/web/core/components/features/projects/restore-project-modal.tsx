import { useOrganizationProjects } from '@/core/hooks';
import { Button, Modal, Text } from '@/core/components';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { EverCard } from '../../common/ever-card';
import { TOrganizationProject } from '@/core/types/schemas';
import { useAtomValue } from 'jotai';
import { organizationProjectsState } from '@/core/stores';

interface IRestoreProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}
/**
 * A modal to confirm the restoration of a project
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 *
 * @returns {JSX.Element} The modal element
 */
export function RestoreProjectModal(props: IRestoreProjectModalProps) {
	const t = useTranslations();
	const { open, closeModal, projectId } = props;
	const organizationProjects = useAtomValue(organizationProjectsState);

	const { editOrganizationProject, editOrganizationProjectLoading, setOrganizationProjects } =
		useOrganizationProjects();
	const project = useMemo(
		() => organizationProjects.find((project) => project.id === projectId),
		[organizationProjects, projectId]
	);

	const handleRestore = useCallback(async () => {
		try {
			const res = await editOrganizationProject(projectId, {
				isArchived: false,
				isActive: true,
				archivedAt: null
			});

			if (res) {
				closeModal();

				setOrganizationProjects(
					organizationProjects.map((project) => {
						if (project.id === projectId) {
							return res.data as TOrganizationProject;
						}
						return project;
					})
				);
			}
		} catch (err) {
			console.error('Failed to restore project', err);
		}
	}, [closeModal, editOrganizationProject, organizationProjects, projectId, setOrganizationProjects]);

	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<EverCard className=" sm:w-[33rem] w-[20rem]" shadow="custom">
				<div className="flex justify-center items-center py-3 w-full text-primary">
					<RotateCcw size={45} />
				</div>

				<div className="flex flex-col gap-5 justify-between items-center">
					<Text.Heading as="h3" className="text-center">
						{t('pages.projects.restoreModal.title')}
					</Text.Heading>

					<p className=" text-center text-[1rem] text-gray-600">
						{t('pages.projects.restoreModal.description', { projectName: project?.name })}
					</p>

					<div className="flex justify-between items-center w-full">
						<Button onClick={closeModal} className="h-[2.75rem]" variant="outline">
							{t('common.CANCEL')}
						</Button>
						<Button
							onClick={handleRestore}
							loading={editOrganizationProjectLoading}
							className="h-[2.75rem] bg-primary text-primary-foreground"
							type="submit"
						>
							{t('common.RESTORE')}
						</Button>
					</div>
				</div>
			</EverCard>
		</Modal>
	);
}
