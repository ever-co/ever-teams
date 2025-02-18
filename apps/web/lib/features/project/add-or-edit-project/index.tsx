import { Card, Modal } from '@/lib/components';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useState } from 'react';
import AddOrEditContainer from './container';
import FinancialSettingsForm from './steps/financial-settings';
import BasicInformationForm from './steps/basic-information';
import CategorizationForm from './steps/categorization-form';

interface IAddOrEditProjectModallProps {
	open: boolean;
	closeModal: () => void;
}

export default function AddOrEditProjectModal(props: IAddOrEditProjectModallProps) {
	const { open, closeModal } = props;

	const initialSteps = [
		{ id: 1, title: 'Create Project', isCompleted: false },
		{ id: 2, title: 'Financial Settings', isCompleted: false },
		{ id: 3, title: 'Categorization', isCompleted: false },
		{ id: 4, title: 'Team & Relations', isCompleted: false }
	];

	const [steps, setSteps] = useState(initialSteps);
	const [currentStep, setCurrentStep] = useState(0);

	return (
		<Modal className="w-[50rem]" isOpen={open} closeModal={closeModal}>
			<Card className="w-full  h-full " shadow="custom">
				<div className="flex flex-row items-center justify-between h-12 gap-4">
					{steps.map((step, index) => {
						const isCurrent = index === currentStep;
						const isCompleted = step.isCompleted;
						const isLastStep = index == steps.length - 1;

						return (
							<div key={step.id} className={cn('flex gap-2 items-center', !isLastStep && 'grow')}>
								<div
									className={cn(
										'h-5 w-5 shrink-0 bg-gray-400 flex items-center justify-center rounded-full text-white',
										step.isCompleted && 'bg-green-700 text-white',
										isCurrent && 'bg-primary text-primary-foreground'
									)}
								>
									{step.isCompleted ? <Check size={15} /> : <span>{step.id}</span>}
								</div>
								<div
									className={cn(
										'text-xs shrink-0 font-medium text-gray-400',
										isCompleted && 'text-green-700',
										isCurrent && 'text-primary'
									)}
								>
									{step.title}
								</div>
								{!isLastStep && <div className="h-[1px] bg-gray-300 grow"></div>}
							</div>
						);
					})}
				</div>
				<div className="w-full">
					<AddOrEditContainer>
						{/* <BasicInformationForm /> */}
						{/* <FinancialSettingsForm /> */}
						<CategorizationForm />
					</AddOrEditContainer>
				</div>
			</Card>
		</Modal>
	);
}
