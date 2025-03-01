import { ICreateProjectInput, IImageAssets, IProject } from '@/app/interfaces';
import { Children, cloneElement, isValidElement, PropsWithChildren, ReactElement } from 'react';
import { TModalMode } from '.';

interface IAddOrEditContainerProps extends PropsWithChildren {
	onNext?: (data: TStepData) => void;
	onFinish?: (project: IProject) => void;
	step: number;
	currentData: TStepData;
	mode: TModalMode;
}

export type TStepData = Partial<
	ICreateProjectInput & {
		projectImage?: IImageAssets;
		members?: { memberId: string; roleId: string; id: string }[];
		id?: string;
	}
>;

export interface IStepElementProps extends PropsWithChildren {
	goToNext: (stepData: TStepData) => void;
	finish: (newProject: IProject) => void;
	currentData: TStepData;
	mode: TModalMode;
}

export default function AddOrEditContainer(props: IAddOrEditContainerProps) {
	const { onNext, children, step, onFinish, currentData, mode } = props;

	const childrenArray = Children.toArray(children) as ReactElement<IStepElementProps>[];

	const currentStep = childrenArray[step];

	const handleNext = (data: TStepData) => {
		if (step < childrenArray.length - 1) {
			onNext?.(data);
		}
	};

	const handleFinish = (data: IProject) => {
		onFinish?.(data);
	};

	if (!currentStep) return null;

	// Check if the current step is a valid ReactElement with props of type IStepElementProps or ILastStepElementProps.
	if (isValidElement<IStepElementProps>(currentStep)) {
		return cloneElement(currentStep as ReactElement<IStepElementProps>, {
			goToNext: handleNext,
			finish: handleFinish,
			currentData,
			mode
		});
	}

	return currentStep;
}
