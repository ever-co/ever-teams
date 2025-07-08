import { Children, cloneElement, isValidElement, PropsWithChildren, ReactElement } from 'react';
import { TModalMode } from '.';
import { TImageAsset } from '@/core/types/schemas';
import { TCreateProjectRequest, TOrganizationProject } from '@/core/types/schemas';

interface IAddOrEditContainerProps extends PropsWithChildren {
	onNext?: (data: TStepData) => void;
	onPrevious?: (data: TStepData) => void;
	onFinish?: (project: TOrganizationProject) => void;
	step: number;
	currentData: TStepData;
	mode: TModalMode;
}

export type TStepData = Partial<
	TCreateProjectRequest & {
		projectImage?: TImageAsset;
		members?: { memberId: string; roleId: string; id: string }[];
		id?: string;
	}
>;

export interface IStepElementProps extends PropsWithChildren {
	goToNext?: (stepData: TStepData) => void;
	goToPrevious?: (stepData: TStepData) => void;
	finish?: (newProject: TOrganizationProject) => void;
	currentData?: TStepData;
	mode?: TModalMode;
}

export default function AddOrEditContainer(props: IAddOrEditContainerProps) {
	const { onNext, onPrevious, children, step, onFinish, currentData, mode } = props;

	const childrenArray = Children.toArray(children) as ReactElement<IStepElementProps>[];

	const currentStep = childrenArray[step];

	const handleNext = (data: TStepData) => {
		if (step < childrenArray.length - 1) {
			onNext?.(data);
		}
	};

	const handlePrevious = (data: TStepData) => {
		if (step > 0) {
			onPrevious?.(data);
		}
	};

	const handleFinish = (data: TOrganizationProject) => {
		onFinish?.(data);
	};

	if (!currentStep) return null;

	// Check if the current step is a valid ReactElement with props of type IStepElementProps or ILastStepElementProps.
	if (isValidElement<IStepElementProps>(currentStep)) {
		return cloneElement(currentStep as ReactElement<IStepElementProps>, {
			goToNext: handleNext,
			goToPrevious: handlePrevious,
			finish: handleFinish,
			currentData,
			mode
		});
	}

	return currentStep;
}
