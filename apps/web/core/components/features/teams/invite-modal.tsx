import { InviteFormModal } from './invite-form-modal';
import { TTask } from '@/core/types/schemas/task/task.schema';

export interface IInviteProps {
	isOpen: boolean;
	Fragment?: any;
	closeModal: any;
	task: TTask | null;
}

/** The older entry point (the invite card of the member list): the same invitation dialog as everywhere else. */
const InviteModal = ({ isOpen, closeModal }: IInviteProps) => {
	return <InviteFormModal open={isOpen} closeModal={closeModal} />;
};

export default InviteModal;
