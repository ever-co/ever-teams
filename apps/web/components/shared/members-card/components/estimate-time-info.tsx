import { pad } from '@app/helpers/number';
import { ITeamTask } from '@app/interfaces/ITask';
import { TimeInput } from '@components/ui/inputs/time-input';
import { Spinner } from '@components/ui/loaders/spinner';
import Image from 'next/legacy/image';
import { Dispatch, forwardRef, RefObject, SetStateAction, useCallback } from 'react';
import { MC_EditableValues } from '../types';
import { EstimationProgress } from './estimation-progress';
import { useTranslations } from 'next-intl';

type Props = {
	memberTask: ITeamTask | null;
	editMode: boolean;
	hasEditMode: boolean;
	editable: MC_EditableValues;
	onSubmitEstimation: () => void;
	onChangeEstimate: (c: keyof MC_EditableValues) => any;
	setEditMode: Dispatch<SetStateAction<boolean>>;
	loading: boolean;
	isAuthUser: boolean;
	clickIgnoreEl: RefObject<HTMLDivElement> | ((el: any) => any);
};

export const EstimateTimeInfo = forwardRef<HTMLDivElement, Props>(
	(
		{
			isAuthUser,
			memberTask,
			editMode,
			editable,
			setEditMode,
			hasEditMode,
			loading,
			onSubmitEstimation,
			onChangeEstimate,
			clickIgnoreEl
		},
		ref
	) => {
		const t = useTranslations();
		const canEditMode = useCallback(() => {
			hasEditMode && setEditMode(true);
		}, [setEditMode, hasEditMode]);

		return (
			<div className="w-[245px]  flex justify-center items-center">
				<div>
					<EstimationProgress memberTask={memberTask} isAuthUser={isAuthUser} />
					<div className="text-center text-[14px] text-[#9490A0]  py-1 font-light flex items-center justify-center">
						{!editMode && (
							<div className="flex items-center">
								<div>
									{t('common.ESTIMATE')} : {editable.estimateHours}h {pad(editable.estimateMinutes)}m
								</div>
								<span
									className="ml-[15px] flex items-center cursor-pointer"
									onClick={canEditMode}
									ref={clickIgnoreEl}
								>
									<Image src="/assets/png/edit.png" width={20} height={20} alt="edit icon" />
								</span>
							</div>
						)}
						{editMode && (
							<div className="flex items-center justify-center">
								<div className="bg-[#F2F4FB] dark:bg-[#18181B] flex" ref={ref}>
									<TimeInput
										value={'' + editable.estimateHours}
										type="string"
										placeholder="h"
										name="estimateHours"
										handleChange={onChangeEstimate('estimateHours')}
										handleEnter={onSubmitEstimation}
										handleDoubleClick={canEditMode}
										style={`w-[30px] h-[30px] pt-1 bg-transparent`}
									/>
									<div className="mr-2 h-[30px] flex items-end text-[14px] border-b-2 dark:border-[#616164] border-dashed">
										h
									</div>
									<div className="flex items-center">:</div>
									<TimeInput
										value={'' + editable.estimateMinutes}
										type="string"
										placeholder="m"
										name="estimateMinutes"
										handleChange={onChangeEstimate('estimateMinutes')}
										handleDoubleClick={canEditMode}
										handleEnter={onSubmitEstimation}
										style={`w-[30px] bg-transparent h-[30px] pt-1`}
									/>
									<div className="mr-2 h-[30px] flex items-end text-[14px] border-b-2 dark:border-[#616164] border-dashed">
										m
									</div>
								</div>{' '}
								<span className="w-3 h-5 ml-2">{loading && <Spinner dark={false} />}</span>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}
);

EstimateTimeInfo.displayName = 'EstimateTimeInfo';
