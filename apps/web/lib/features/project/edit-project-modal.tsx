import { useOrganizationProjects } from '@/app/hooks';
import { Modal } from 'lib/components';
import { useMemo } from 'react';
import AddOrEditProjectForm from './add-or-edit-project';
import { RolesEnum } from '@/app/interfaces/IRoles';
import { useRoles } from '@/app/hooks/features/useRoles';

interface IEditProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}
/**
 * A modal to edit a project
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 *
 * @returns {JSX.Element} The modal element
 */
export function EditProjectModal(props: IEditProjectModalProps) {
	const { open, closeModal, projectId } = props;
	const { organizationProjects } = useOrganizationProjects();
	const { roles } = useRoles();

	const simpleMemberRole = roles?.find((role) => role.name == RolesEnum.EMPLOYEE);
	const managerRole = roles?.find((role) => role.name == RolesEnum.MANAGER);

	const data = useMemo(() => {
		const project = organizationProjects.find((project) => project.id === projectId);

		return project
			? {
					...project,
					members:
						project.members?.map((el) => ({
							id: `${el.id}-${String(el.role)}`,
							memberId: el.employeeId,
							roleId: el.isManager ? managerRole?.id : simpleMemberRole?.id
						})) || [],
					tags: project.tags?.map((el) => el.id),
					relations: []
				}
			: {};
	}, [managerRole?.id, organizationProjects, projectId, simpleMemberRole?.id]);

	return (
		<Modal className="w-[50rem]" isOpen={open} closeModal={closeModal} alignCloseIcon>
			<AddOrEditProjectForm onFinish={closeModal} mode="edit" projectData={data} />
		</Modal>
	);
}
