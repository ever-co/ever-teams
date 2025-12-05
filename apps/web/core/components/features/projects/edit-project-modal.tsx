import { Modal } from '@/core/components';
import { useMemo } from 'react';
import { organizationProjectsState, rolesState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import AddOrEditProjectForm from './add-or-edit-project';
import { ERoleName } from '@/core/types/generics/enums/role';
import { ITag } from '@/core/types/interfaces/tag/tag';
import { ROLES } from '@/core/constants/config/constants';

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

	const rolesFromApi = useAtomValue(rolesState);

	// Get role IDs with fallback to constants if API doesn't return roles
	const { simpleMemberRoleId, managerRoleId } = useMemo(() => {
		// Try to get from API first
		if (rolesFromApi && rolesFromApi.length > 0) {
			const simpleMemberRole = rolesFromApi.find((role) => role.name === ERoleName.EMPLOYEE);
			const managerRole = rolesFromApi.find((role) => role.name === ERoleName.MANAGER);
			return {
				simpleMemberRoleId: simpleMemberRole?.id ? String(simpleMemberRole.id) : undefined,
				managerRoleId: managerRole?.id ? String(managerRole.id) : undefined
			};
		}

		// Fallback to ROLES constants with generated IDs
		const simpleMemberRole = ROLES.find((role) => role.name === ERoleName.EMPLOYEE);
		const managerRole = ROLES.find((role) => role.name === ERoleName.MANAGER);
		return {
			simpleMemberRoleId: simpleMemberRole ? `fallback-${simpleMemberRole.name}` : undefined,
			managerRoleId: managerRole ? `fallback-${managerRole.name}` : undefined
		};
	}, [rolesFromApi]);

	const data = useMemo(() => {
		const project = organizationProjects.find((project) => project.id === projectId);

		return project
			? {
					...project,
					members:
						project.members?.map((el) => ({
							id: `${el.id}-${String(el.role)}`,
							memberId: el.employeeId,
							roleId: el.isManager ? managerRoleId : simpleMemberRoleId
						})) || [],
					tags: project.tags?.map((el: ITag) => el.id),
					relations: []
				}
			: {};
	}, [managerRoleId, organizationProjects, projectId, simpleMemberRoleId]);

	return (
		<Modal className="w-[50rem]" isOpen={open} closeModal={closeModal} alignCloseIcon>
			<AddOrEditProjectForm onFinish={closeModal} mode="edit" projectData={data} />
		</Modal>
	);
}
