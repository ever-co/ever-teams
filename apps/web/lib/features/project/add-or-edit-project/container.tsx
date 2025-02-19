import { Children, cloneElement, isValidElement, PropsWithChildren, ReactElement } from 'react';

interface IAddOrEditContainerProps extends PropsWithChildren {
	onNext?: () => void;
	step: number;
}

export interface IStepElementProps extends PropsWithChildren {
	goToNext: () => void;
}

export default function AddOrEditContainer(props: IAddOrEditContainerProps) {
	const { onNext, children, step } = props;

	const childrenArray = Children.toArray(children) as ReactElement<IStepElementProps>[];

	const currentStep = childrenArray[step];

	if (!currentStep) return null;

	if (isValidElement<IStepElementProps>(currentStep)) {
		return cloneElement(currentStep as ReactElement<IStepElementProps>, { goToNext: onNext });
	}

	return currentStep;
}
