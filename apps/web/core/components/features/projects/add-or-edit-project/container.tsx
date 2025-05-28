import { Children, cloneElement, isValidElement, PropsWithChildren, ReactElement } from 'react';
import { TModalMode } from '.';
import { ICreateProjectRequest, IOrganizationProject } from '@/core/types/interfaces/project/organization-project';
import { IImageAsset } from '@/core/types/interfaces/global/image-asset';

interface IAddOrEditContainerProps extends PropsWithChildren {
	onNext?: (data: TStepData) => void;
	onPrevious?: (data: TStepData) => void;
	onFinish?: (project: IOrganizationProject) => void;
	step: number;
	currentData: TStepData;
	mode: TModalMode;
}

export type TStepData = Partial<
	ICreateProjectRequest & {
		projectImage?: IImageAsset;
		members?: { memberId: string; roleId: string; id: string }[];
		id?: string;
	}
>;

export interface IStepElementProps extends PropsWithChildren {
	goToNext: (stepData: TStepData) => void;
	goToPrevious: (stepData: TStepData) => void;
	finish: (newProject: IOrganizationProject) => void;
	currentData: TStepData;
	mode: TModalMode;
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

	const handleFinish = (data: IOrganizationProject) => {
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
