import { Children, cloneElement, isValidElement, PropsWithChildren, ReactElement } from 'react';

interface IAddOrEditContainerProps extends PropsWithChildren {
	onNext?: () => void;
	step?: number;
}

interface IStepElementProps extends PropsWithChildren {
	onNext: () => void;
}

export default function AddOrEditContainer(props: IAddOrEditContainerProps) {
	const { onNext, children } = props;

	const childrenArray = Children.toArray(children);

	return childrenArray.map((child) => {
		if (isValidElement<IStepElementProps>(child)) {
			return cloneElement(child as ReactElement<IStepElementProps>, { onNext });
		}
		return child;
	});
}
