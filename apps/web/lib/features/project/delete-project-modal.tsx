import { useOrganizationProjects } from '@/app/hooks';
import { Button, Card, Modal, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

interface ICreateProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}
/**
 * A modal to confirm the deletion of a project
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 *
 * @returns {JSX.Element} The modal element
 */
export function DeleteProjectConfirmModal(props: ICreateProjectModalProps) {
	const t = useTranslations();
	const { open, closeModal, projectId } = props;
	const { deleteOrganizationProject, deleteOrganizationProjectLoading, setOrganizationProjects } =
		useOrganizationProjects();

	const handleDelete = useCallback(async () => {
		try {
			const res = await deleteOrganizationProject(projectId);

			if (res) {
				closeModal();

				setOrganizationProjects((prev) => prev.filter((el) => el.id !== projectId));
			}
		} catch (err) {
			console.error('Failed to delete project', err);
		}
	}, [closeModal, deleteOrganizationProject, projectId, setOrganizationProjects]);

	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<Card className=" sm:w-[33rem] w-[20rem]" shadow="custom">
				<div className="flex flex-col items-center justify-between gap-8">
					<Text.Heading as="h3" className="text-center">
						{t('pages.projects.deleteModal.title')}
					</Text.Heading>

					<p className=" text-center text-[1rem] text-gray-600">
						{t('pages.projects.deleteModal.description')}
					</p>

					<div className="flex items-center justify-between w-full">
						<Button onClick={closeModal} className="h-[2.75rem]" variant="outline">
							{t('common.CANCEL')}
						</Button>
						<Button
							onClick={handleDelete}
							loading={deleteOrganizationProjectLoading}
							className="h-[2.75rem] bg-red-600"
							type="submit"
						>
							{t('common.DELETE')}
						</Button>
					</div>
				</div>
			</Card>
		</Modal>
	);
}
