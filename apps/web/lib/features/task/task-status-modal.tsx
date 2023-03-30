import { useModal } from '@app/hooks';
import { ITaskStatusField } from '@app/interfaces';
import { Modal, Card, Text, Button } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { taskIssues } from './task-issue';
import {
	TTaskStatusesDropdown,
	TStatus,
	useStatusValue,
	StatusDropdown,
	TaskStatus,
	useTaskStatusValue,
	useTaskPrioritiesValue,
	useTaskSizesValue,
	useTaskLabelsValue,
} from './task-status';

export function StatusModal<T extends ITaskStatusField>({
	type,
	onValueChange,
	defaultValue,
	title,
}: {
	type: T;
	title: string;
} & TTaskStatusesDropdown<T>) {
	const { isOpen, closeModal, openModal } = useModal();
	const { trans } = useTranslation();
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
		issue: taskIssues,
		project: {},
		epic: {},
		team: {},
		version: {},
		tags: {},
	};

	const { item, items, onChange } = useStatusValue<T>(
		status[type],
		defaultValue,
		onValueChange
	);

	useEffect(() => {
		if (isOpen) {
			window.setTimeout(() => {
				checkedRef?.current?.scrollIntoView();
			}, 10);
		}
	}, [isOpen]);

	return (
		<>
			<button onClick={openModal}>
				<StatusDropdown showButtonOnly={true} items={items} value={item} />
			</button>

			<Modal isOpen={isOpen} closeModal={closeModal}>
				<div className="w-[98%] md:w-[530px]">
					<Card className="w-full" shadow="custom">
						<div className="flex flex-col justify-between items-center w-full">
							<Text.Heading as="h3" className="text-center mb-2">
								{title}
							</Text.Heading>

							<div className="max-h-96 overflow-y-auto min-h-[120px] w-full">
								<ul>
									{items.map((item, i) => {
										const active = value === item.name;
										return (
											<li key={i} className="mb-2">
												<div
													ref={active ? checkedRef : undefined}
													className="input-border rounded-xl p-2 flex justify-between w-full cursor-pointer"
													onClick={() => {
														setValue(item.name as any);
													}}
												>
													<TaskStatus {...item} />
													<input
														type="radio"
														name="status-1"
														checked={active}
														readOnly
													/>
												</div>
											</li>
										);
									})}
								</ul>
							</div>

							<div className="flex justify-between w-full mt-2">
								<Button
									disabled={!value}
									variant="outline-dark"
									onClick={closeModal}
								>
									{trans.common.CANCEL}
								</Button>

								<Button
									disabled={!value}
									onClick={() => {
										if (value) {
											onChange(value);
											closeModal();
										}
									}}
								>
									{trans.common.CONFIRM}
								</Button>
							</div>
						</div>
					</Card>
				</div>
			</Modal>
		</>
	);
}
