import { IHookModal, useModal } from '@app/hooks';
import { ITaskStatusField } from '@app/interfaces';
import { Button, Card, Modal, Text } from 'lib/components';
import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import { taskIssues } from './task-issue';
import {
	StatusDropdown,
	TStatus,
	TTaskStatusesDropdown,
	TaskStatus,
	useStatusValue,
	useTaskLabelsValue,
	useTaskPrioritiesValue,
	useTaskSizesValue,
	useTaskStatusValue
} from './task-status';

export function TaskStatusModal<T extends ITaskStatusField>({
	types,
	onValueChange,
	defaultValue,
	title,
	children,
	modal
}: {
	types: T;
	title: string;
	modal?: IHookModal;
} & TTaskStatusesDropdown<T>) {
	const imodal = useModal();
	const { isOpen, closeModal, openModal } = modal || imodal;

	const { t } = useTranslation();
	const [value, setValue] = useState(defaultValue);
	const checkedRef = useRef<HTMLDivElement | null>(null);

	const taskStatusValues = useTaskStatusValue();
	const taskPrioritiesValues = useTaskPrioritiesValue();
	const taskSizesValue = useTaskSizesValue();
	const taskLabels = useTaskLabelsValue();

	const status: { [k in ITaskStatusField]: TStatus<any> } = {
		status: taskStatusValues,
		priority: taskPrioritiesValues,
		size: taskSizesValue,
		label: taskLabels,
		issueType: taskIssues,
		project: {},
		epic: {},
		team: {},
		version: {},
		tags: {}
	};

	const { item, items, onChange } = useStatusValue<T>({
		status: status[types],
		value: defaultValue,
		onValueChange
	});

	useEffect(() => {
		if (isOpen) {
			window.setTimeout(() => {
				checkedRef?.current?.scrollIntoView();
			}, 10);
		}
	}, [isOpen]);

	return (
		<>
			{children ? (
				children
			) : (
				<button onClick={openModal}>
					<StatusDropdown showButtonOnly={true} items={items} value={item} />
				</button>
			)}

			<Modal isOpen={isOpen} closeModal={closeModal}>
				<div className="w-[98%] md:w-[33rem]">
					<Card className="w-full" shadow="custom">
						<div className="flex flex-col items-center justify-between w-full">
							<Text.Heading as="h3" className="mb-2 text-center">
								{title}
							</Text.Heading>

							<div className="max-h-96 overflow-y-auto min-h-[7.5rem] w-full">
								<ul>
									{items.map((item, i) => {
										const active = value === item.name;
										return (
											<li key={i} className="mb-2">
												<div
													ref={active ? checkedRef : undefined}
													className="flex justify-between w-full p-2 cursor-pointer input-border rounded-xl"
													onClick={() => {
														setValue(item.name as any);
													}}
												>
													<TaskStatus {...item} />
													<input type="radio" name="status-1" checked={active} readOnly />
												</div>
											</li>
										);
									})}
								</ul>
							</div>

							<div className="flex justify-end w-full h-10 gap-2">
								<Button
									disabled={!value}
									variant="outline-dark"
									onClick={closeModal}
									className="rounded-xl"
								>
									{t('common.CANCEL')}
								</Button>

								<Button
									disabled={!value}
									onClick={() => {
										if (value) {
											onChange(value);
											closeModal();
										}
									}}
									className="rounded-xl"
								>
									{t('common.CONFIRM')}
								</Button>
							</div>
						</div>
					</Card>
				</div>
			</Modal>
		</>
	);
}
