import { useModal } from '@app/hooks';
import { ITaskIssue } from '@app/interfaces';
import { PlusIcon } from '@heroicons/react/20/solid';
import {
	BackButton,
	Button,
	Card,
	InputField,
	Modal,
	Text,
} from 'lib/components';
import {
	BugReportIcon,
	CategoryIcon,
	NoteIcon,
	TaskSquareIcon,
} from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import {
	StatusDropdown,
	TStatus,
	TTaskStatusesDropdown,
	useStatusValue,
} from './task-status';

export const taskIssues: TStatus<ITaskIssue> = {
	Bug: {
		icon: <BugReportIcon />,
		bgColor: '#923535',
	},
	Task: {
		icon: <TaskSquareIcon />,
		bgColor: '#5483BA',
	},
	Story: {
		icon: <NoteIcon />,
		bgColor: '#66BB97',
	},
	Custom: {
		icon: <CategoryIcon />,
		bgColor: '#8154BA',
	},
};

export function TaskIssuesDropdown({
	className,
	defaultValue,
	onValueChange,
}: TTaskStatusesDropdown<'issue'>) {
	const { trans } = useTranslation();
	const { isOpen, openModal, closeModal } = useModal();
	const { item, items, onChange } = useStatusValue<'issue'>(
		taskIssues,
		defaultValue,
		onValueChange
	);

	return (
		<>
			<StatusDropdown
				className={className}
				items={items}
				value={item}
				onChange={onChange}
				issueType="issue"
			>
				<Button
					onClick={openModal}
					className="min-w-[50px] text-xs px-1 py-2 gap-0 w-full"
					variant="outline-danger"
				>
					<PlusIcon className="w-4 h-4" />
					{trans.common.NEW_ISSUE}
				</Button>
			</StatusDropdown>
			<CreateTaskIssueModal open={isOpen} closeModal={closeModal} />
		</>
	);
}

export function CreateTaskIssueModal({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const { trans } = useTranslation();
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
	};

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form
				className="w-[98%] md:w-[530px]"
				autoComplete="off"
				onSubmit={handleSubmit}
			>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center">
							{trans.common.CREARE_ISSUE}
						</Text.Heading>

						<div className="w-full mt-5">
							<InputField
								name="name"
								autoCustomFocus
								placeholder={trans.form.ISSUE_NAME_PLACEHOLDER}
								required
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<BackButton onClick={closeModal} />
							<Button type="submit">{trans.common.CREATE}</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
