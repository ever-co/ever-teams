import { ILabel, IProject, IProjectRelation } from '@/app/interfaces';
import { Children, cloneElement, isValidElement, PropsWithChildren, ReactElement } from 'react';

interface IAddOrEditContainerProps extends PropsWithChildren {
	onNext?: (data: TStepData) => void;
	onFinish?: (project: IProject) => void;
	step: number;
	currentData: TStepData;
}

export type TStepData = Partial<
	IProject & {
		memberIds?: string[];
		managerIds?: string[];
		// TO BE DONE ON THE API side :
		labels?: Omit<ILabel, 'id'>[]; // labelling
		relations: IProjectRelation[]; // relationship
	}
>;

export interface IStepElementProps extends PropsWithChildren {
	goToNext: (stepData: TStepData) => void;
	finish: (newProject: IProject) => void;
	currentData: TStepData;
}

export default function AddOrEditContainer(props: IAddOrEditContainerProps) {
	const { onNext, children, step, onFinish, currentData } = props;

	const childrenArray = Children.toArray(children) as ReactElement<IStepElementProps>[];

	const currentStep = childrenArray[step];

	const handleNext = (data: TStepData) => {
		console.log('third');
		if (step < childrenArray.length - 1) {
			console.log('fourth');
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
			currentData
		});
	}

	return currentStep;
}
