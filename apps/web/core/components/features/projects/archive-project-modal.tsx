import { useOrganizationProjects, useTeamTasks } from '@/core/hooks';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';
import { Button, Modal, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { clsxm } from '@/core/lib/utils';
import moment from 'moment';
import { EverCard } from '../../common/ever-card';
import { TaskNameInfoDisplay } from '../../tasks/task-displays';
import { TOrganizationProject } from '@/core/types/schemas';

interface IArchiveProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}
/**
 * A modal to archive a project
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 * @param {string} props.projectId - The project id to operate on
 *
 * @returns {JSX.Element} The modal element
 */
export function ArchiveProjectModal(props: IArchiveProjectModalProps) {
	const t = useTranslations();
	const { open, closeModal, projectId } = props;
	const { setOrganizationProjects, organizationProjects, editOrganizationProject, editOrganizationProjectLoading } =
		useOrganizationProjects();

	const { updateTask } = useTeamTasks();
	const project = useMemo(
		() => organizationProjects.find((project) => project.id === projectId),
		[organizationProjects, projectId]
	);
	const affectedTasks = useMemo(() => project?.tasks ?? [], [project]);

	const unlinkAffectedTasks = useCallback(async () => {
		try {
			if (affectedTasks.length) {
				await Promise.all(
					affectedTasks.map(async (task) => {
						await updateTask({ ...task, projectId: undefined });
					})
				);
			}
		} catch (err) {
			console.error('Failed to unlink tasks from project', err);
		}
	}, [affectedTasks, updateTask]);

	const handleArchive = useCallback(async () => {
		try {
			const res = await editOrganizationProject(projectId, {
				isArchived: true,
				isActive: false,
				archivedAt: moment(Date.now()).format()
			});

			if (res) {
				closeModal();

				if (affectedTasks.length) {
					unlinkAffectedTasks();
				}

				setOrganizationProjects(
					organizationProjects.map((project) => {
						if (project.id === projectId) {
							return res.data as TOrganizationProject;
						}
						return project as TOrganizationProject;
					})
				);
			}
		} catch (err) {
			console.error('Failed to delete project', err);
		}
	}, [
		affectedTasks.length,
		closeModal,
		editOrganizationProject,
		organizationProjects,
		projectId,
		setOrganizationProjects,
		unlinkAffectedTasks
	]);

	// The height of affected tasks view
	const scrollAreaHeight = useMemo(() => {
		const scrollAreaItemHeight = 2.325; //rem
		const maxItemsInScrollArea = 8;
		const scrollAreaPadding_yAxis = 1.4; // rem

		return `${scrollAreaItemHeight * Math.min(affectedTasks.length, maxItemsInScrollArea) + scrollAreaPadding_yAxis}rem`;
	}, [affectedTasks.length]);

	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<EverCard className=" sm:w-[28rem] w-[16rem]" shadow="custom">
				<div className="flex flex-col items-center justify-between gap-8">
					<Text.Heading as="h3" className="text-center">
						{t('pages.projects.archiveModal.title', { projectName: project?.name })}
					</Text.Heading>

					{affectedTasks.length > 0 ? (
						<>
							<p className=" text-center text-[1rem] text-gray-600">
								{t('pages.projects.archiveModal.description', {
									affectedTasksCount: affectedTasks.length,
									projectName: project?.name
								})}
							</p>

							<ScrollArea style={{ height: scrollAreaHeight }} className="w-full ">
								<div className="flex flex-col w-full h-full gap-2 p-2 m-auto border rounded-md">
									{affectedTasks.map((task) => (
										<TaskNameInfoDisplay
											key={task.id}
											task={task}
											className={clsxm('border')}
											taskTitleClassName={clsxm('')}
										/>
									))}
								</div>

								<ScrollBar className="-pl-5" />
							</ScrollArea>
						</>
					) : null}

					<div className="flex items-center justify-between w-full gap-3">
						<Button
							disabled={editOrganizationProjectLoading}
							onClick={closeModal}
							className="h-[2.75rem] flex-1"
							variant="outline"
						>
							{t('common.CANCEL')}
						</Button>
						<Button
							loading={editOrganizationProjectLoading}
							disabled={editOrganizationProjectLoading}
							onClick={handleArchive}
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
