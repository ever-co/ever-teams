import { useState } from 'react';
import { useEditTaskStatus } from '@/core/hooks/tasks/use-edit-task-status';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { DialogTitle } from '@headlessui/react';
import {
	Button,
	ColorPicker,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components';
import {
	DialogBreadcrumb,
	DialogBreadcrumbSeparator,
	DialogHeaderRow,
	dialogTitleText
} from '@/core/components/common/dialog';
import { useForm } from 'react-hook-form';
import { generateIconList, IIcon } from '@/core/components/settings/icon-items';
import { useTranslations } from 'next-intl';
import IconPopover from '@/core/components/settings/icon-popover';
import { Spinner } from '@/core/components/icons';
import { InputField } from '../../duplicated-components/_input';
import { ETaskStatusName } from '@/core/types/schemas';
import { publicAssetUrl } from '@/core/lib/helpers/public-asset-url';

type EditSet = {
	name: ETaskStatusName;
	color: string;
	icon: string;
};
const EditStatusModal = ({ status, onClose, setColumn }: { status: any; onClose: any; setColumn: any }) => {
	const { editTaskStatus, editTaskStatusLoading } = useEditTaskStatus();
	const { setTaskStatuses } = useTaskStatusesQuery();
	const [createNew] = useState(status);
	const t = useTranslations();
	const { register, handleSubmit, setValue, getValues } = useForm({
		defaultValues: {
			name: status.name || '',
			color: status.color || '',
			icon: status.icon || ''
		}
	});
	const renameProperty = (newProp: string, icon: string) => {
		setColumn((prev: any) => {
			const newColumn = prev.map((column: any) => {
				if (column.id === status.id) {
					return {
						...column,
						name: newProp,
						// This deployment's API, or this app's /api proxy when it publishes no API origin to
						// the browser: a self-hosted instance never loads icons from Ever's API. An absolute
						// URL (https, or http on a self-hosted API / MinIO) is kept as it is.
						icon: publicAssetUrl(icon)
					};
				}
				return column;
			});
			return newColumn;
		});
	};

	const onSubmit = async (values: EditSet) => {
		if (status && values) {
			await editTaskStatus(status.id, {
				...values,
				color: !values.color ? status.color : values.color
			}).then((updateResult) => {
				if (updateResult && updateResult.affected > 0) {
					// Update task statuses state - only update the changed properties
					setTaskStatuses((prev) => {
						return prev.map((el) => {
							if (el.id === status.id) {
								return {
									...el,
									name: values.name,
									icon: values.icon,
									color: !values.color ? status.color : values.color
								};
							}
							return el;
						});
					});
				}
				renameProperty(values.name, values.icon);

				// Call this function with 'Open1' and 'Open2' when you need to change the property name.
				onClose();
			});
		}
	};
	const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
		'open',
		'in-progress',
		'ready',
		'in-review',
		'blocked',
		'completed'
	]);
	const taskSizesIconList: IIcon[] = generateIconList('task-sizes', ['x-large', 'large', 'medium', 'small', 'tiny']);
	const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', ['urgent', 'high', 'medium', 'low']);

	const iconList: IIcon[] = [...taskStatusIconList, ...taskSizesIconList, ...taskPrioritiesIconList];
	let headingAction = t('common.EDIT');
	if (createNew) {
		headingAction = t('common.NEW');
	}

	return (
		<div className="w-[32rem] max-w-full">
			<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
				<DialogHeaderRow className="pr-9">
					{status.name && <DialogBreadcrumb>{status.name}</DialogBreadcrumb>}
					{status.name && <DialogBreadcrumbSeparator />}
					<DialogTitle className={dialogTitleText}>
						{headingAction} {t('common.ISSUE_TYPE')}
					</DialogTitle>
				</DialogHeaderRow>
				<div className="flex w-full flex-col gap-3">
					<InputField
						type="text"
						placeholder={t('pages.settingsTeam.CREATE_NEW_ISSUE_TYPES')}
						className="mb-0"
						wrapperClassName="mb-0"
						{...register('name')}
					/>

					<div className="flex items-center gap-3">
						<IconPopover
							iconList={iconList}
							setValue={setValue as any}
							active={iconList.find((v) => v.fullUrl === getValues('icon'))}
						/>
						<ColorPicker defaultColor={status.color} onChange={(e) => setValue('color', e)} />
					</div>
				</div>
				<div className={modalFooterClass}>
					<Button
						variant="ghost"
						size="default"
						className={modalSecondaryActionClass}
						onClick={() => {
							onClose();
						}}
					>
						{t('common.CANCEL')}
					</Button>
					<Button
						variant="primary"
						type="submit"
						size="default"
						className={modalPrimaryActionClass}
						disabled={editTaskStatusLoading}
						loading={editTaskStatusLoading}
					>
						{t('common.EDIT')} {editTaskStatusLoading && <Spinner className="size-4 animate-spin" />}
					</Button>
				</div>
			</form>
		</div>
	);
};

export default EditStatusModal;
