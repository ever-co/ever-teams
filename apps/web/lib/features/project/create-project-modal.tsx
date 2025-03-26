import { Modal } from 'lib/components';
import AddOrEditProjectForm from './add-or-edit-project';

interface ICreateProjectModalProps {
	open: boolean;
	closeModal: () => void;
}
/**
 * A modal to create a project
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 *
 * @returns {JSX.Element} The modal element
 */
export function CreateProjectModal(props: ICreateProjectModalProps) {
	const { open, closeModal } = props;

	return (
		<Modal className="w-[50rem]" isOpen={open} closeModal={closeModal} alignCloseIcon>
			<AddOrEditProjectForm onFinish={closeModal} mode="create" projectData={{}} />
		</Modal>
	);
}
