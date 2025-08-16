import { Modal } from '@/core/components';
import { useMemo } from 'react';
import { organizationProjectsState, rolesState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import AddOrEditProjectForm from './add-or-edit-project';
import { ERoleName } from '@/core/types/generics/enums/role';
import { ITag } from '@/core/types/interfaces/tag/tag';

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
	const organizationProjects = useAtomValue(organizationProjectsState);

	const roles = useAtomValue(rolesState);
	const simpleMemberRole = roles?.find((role) => role.name == ERoleName.EMPLOYEE);
	const managerRole = roles?.find((role) => role.name == ERoleName.MANAGER);

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
					tags: project.tags?.map((el: ITag) => el.id),
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
