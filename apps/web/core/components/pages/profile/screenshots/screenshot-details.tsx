'use client';
import { Modal } from '@/core/components';
import ScreenshotItem from './screenshot-item';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useState } from 'react';
import { useOrganizationProjects, useTeamTasks } from '@/core/hooks';
import Image from 'next/image';
import { cn } from '@/core/lib/helpers';
import { ProgressBar } from '@/core/components/duplicated-components/_progress-bar';
import { IOrganizationProject } from '@/core/types/interfaces/project/organization-project';
import { ITask } from '@/core/types/interfaces/task/task';
import { TTimeSlot } from '@/core/types/schemas';

const ScreenshotDetailsModal = ({
	open,
	closeModal,
	slot
}: {
	open: boolean;
	closeModal: () => void;
	slot?: TTimeSlot | null;
}) => {
	const t = useTranslations();

	const timeInterval =
		slot?.startedAt &&
		slot?.stoppedAt &&
		`
			${new Date(slot?.startedAt).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})}
			-
			${new Date(slot?.stoppedAt).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})}
`;

	const [project, setProject] = useState<IOrganizationProject | null>(null);
	const [task, setTask] = useState<ITask | null>(null);

	const { organizationProjects } = useOrganizationProjects();
	const { getTaskById } = useTeamTasks();

	const getProject = useCallback(
		async (projectId: string) => {
			const project = organizationProjects?.find((p) => p.id === projectId);

			if (!project) return null;

			setProject(project);
		},
		[organizationProjects]
	);

	const getTask = useCallback(
		async (taskId: string) => {
			const task = await getTaskById(taskId);
			task?.data && setTask(task?.data);
		},
		[getTaskById]
	);

	useEffect(() => {
		if (!slot?.timeLogs?.[0]?.projectId) return;

		getProject(slot.timeLogs[0]?.projectId);
	}, [getProject, slot?.timeLogs]);

	useEffect(() => {
		if (!slot?.timeLogs?.[0]?.taskId) return;

		getTask(slot.timeLogs[0]?.taskId);
	}, [getTask, slot?.timeLogs]);

	return (
		<Modal
			isOpen={open}
			closeModal={closeModal}
			className="bg-white dark:border-[#26272C] dark:bg-[#191a20] dark:border rounded-[1rem] h-[44rem] lg:w-[50rem]"
		>
			<div className="flex flex-col w-full h-full gap-5 p-5 overflow-x-auto">
				<div className="flex flex-col w-full gap-2">
					<h4 className="space-x-2 text-lg font-semibold">
						<span>
							{new Date(slot?.startedAt ?? '').toLocaleDateString('en-US', {
								weekday: 'long',
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</span>
						<span>{timeInterval}</span>
					</h4>
					<ProgressBar progress={slot ? `${slot?.percentage}%` : '0%'} width={'100%'} />
					<span>{timeInterval}</span>
				</div>

				<div className="flex flex-col w-full gap-3">
					<h4 className="text-lg font-medium ">{t('common.SCREENSHOTS')}</h4>

					<div className="flex w-full gap-2 overflow-x-auto">
						{slot?.screenshots?.map((screenshot, i) => (
							<div className="w-[12rem] space-y-2 shrink-0" key={i}>
								<ScreenshotItem
									viewMode="screenShot-only"
									idSlot={slot?.id}
									endTime={slot?.stoppedAt || ''}
									startTime={screenshot?.recordedAt || ''}
									imageUrl={screenshot?.thumbUrl || ''}
									percent={0}
									showProgress={false}
									onShow={() => null}
								/>

								<p className=" font-light text-[.6rem] px-2 text-center">
									{new Date(slot?.startedAt || '').toLocaleDateString('en-US', {
										weekday: 'long',
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})}
									,{' '}
									{new Date(screenshot?.recordedAt ?? '').toLocaleTimeString('en-US', {
										hour: '2-digit',
										minute: '2-digit',
										hour12: false
									})}
								</p>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col w-full gap-3">
					<h4 className="text-lg font-medium ">{t('common.TIME_LOG')}</h4>

					<div className="w-full bg-[#E9E9E9] dark:bg-[#e9e9e90b] p-4 rounded-lg flex-col flex gap-3">
						{/* Source */}
						<div className="flex flex-col w-full gap-2">
							<p className="text-[#707070] font-medium">{t('common.SOURCE')} : </p>
							<div className="flex gap-1 ">
								{slot?.timeLogs?.[0]?.source && (
									<div className="px-3 py-1  text-xs font-medium bg-[#4B2EFF] text-white rounded-sm">
										{slot?.timeLogs?.[0]?.source}
									</div>
								)}

								{slot?.timeLogs?.[0]?.version && (
									<div className="px-3 py-1  text-xs font-medium text-white rounded-sm bg-[#A5A4FF]">
										{slot?.timeLogs?.[0]?.version}
									</div>
								)}
							</div>
						</div>

						{/* Client */}
						<div className="flex flex-col w-full gap-2">
							<p className="text-[#707070] font-medium">{t('common.CLIENT')} : </p>
							<div className="flex gap-1 ">
								{project?.owner ? (
									<div className="px-3 py-1  text-xs font-medium bg-[#FFA39D] text-white rounded-sm">
										{project?.owner}
									</div>
								) : (
									<div className="px-3 py-1  text-xs font-medium bg-[#FFA39D] text-white rounded-sm">
										{t('common.NO_CLIENT')}
									</div>
								)}
							</div>
						</div>

						{/* Project */}
						<div className="flex flex-col w-full gap-2">
							<p className="text-[#707070] font-medium">{t('pages.taskDetails.PROJECT')} : </p>
							{project ? (
								<div className="flex gap-1 ">
									<div className="flex h-8 gap-2">
										<div
											className={cn(
												'w-8 overflow-hidden  h-full uppercase  rounded-sm flex items-center justify-center text-[1rem]',
												!project?.imageUrl && 'bg-[#A5A4FF]'
											)}
										>
											{project?.imageUrl ? (
												<Image
													src={project?.imageUrl}
													alt={project?.name ?? ''}
													width={400}
													height={400}
													className="object-cover w-full h-full"
												/>
											) : (
												project?.name
											)}
										</div>

										<div className=" h-full flex flex-col  justify-center gap-[.4rem]">
											<p className="font-medium leading-3  font-xs">{project?.name}</p>
											<p className=" text-[.6rem] leading-[.5rem]">
												{t('common.MEMBERS_COUNT')} : {project?.membersCount ?? '-'}
											</p>
										</div>
									</div>
								</div>
							) : (
								<div className="px-3 py-1  w-fit text-xs font-medium bg-[#A5A4FF] text-white rounded-sm">
									{t('common.NO_PROJECT')}
								</div>
							)}
						</div>

						{/* To do */}
						<div className="flex flex-col w-full gap-2">
							<p className="text-[#707070] font-medium">{t('common.TO_DO')}</p>
							<div className="flex gap-1 text-xs">{task?.title}</div>
						</div>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default React.memo(ScreenshotDetailsModal);
