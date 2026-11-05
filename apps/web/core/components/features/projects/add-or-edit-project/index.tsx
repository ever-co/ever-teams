import { cn } from '@/core/lib/helpers';
import { Check } from '@/core/components/icons';
import { useCallback, useState } from 'react';
import AddOrEditContainer, { TStepData } from './container';
import TeamAndRelationsForm from './steps/team-and-relations-form';
import BasicInformationForm from './steps/basic-information-form';
import CategorizationForm from './steps/categorization-form';
import FinancialSettingsForm from './steps/financial-settings-form';
import FinalReview from './steps/review-summary';
import { useTranslations } from 'next-intl';

import { TCreateProjectRequest } from '@/core/types/schemas';

export type TModalMode = 'edit' | 'create';

interface IAddOrEditProjectFormProps {
	mode?: TModalMode;
	projectData: TCreateProjectRequest | object;
	onFinish?: VoidFunction;
}

export default function AddOrEditProjectForm(props: IAddOrEditProjectFormProps) {
	const { mode = 'create', projectData, onFinish } = props;
	const t = useTranslations();

	const initialSteps = [
		{ id: 1, title: t('pages.projects.addOrEditModal.steps.createProject'), isCompleted: false },
		{ id: 2, title: t('pages.projects.addOrEditModal.steps.financialSettings'), isCompleted: false },
		{ id: 3, title: t('pages.projects.addOrEditModal.steps.categorization'), isCompleted: false },
		{ id: 4, title: t('pages.projects.addOrEditModal.steps.teamAndRelations'), isCompleted: false }
	];

	const [steps, setSteps] = useState(initialSteps);
	const [currentStep, setCurrentStep] = useState(0);
	const [data, setData] = useState<TStepData>(projectData);

	const onNextStep = useCallback(() => {
		if (currentStep <= steps.length - 1) {
			const updatedSteps = [...steps];
			updatedSteps[currentStep].isCompleted = true;

			if (currentStep < steps.length - 1) {
				updatedSteps[currentStep + 1].isCompleted = false;
			}

			setCurrentStep(currentStep + 1);
			setSteps(updatedSteps);
		}
	}, [currentStep, steps]);

	const handlePreviousStep = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	}, [currentStep]);

	const handleNext = (stepData: TStepData) => {
		setData((prev) => ({
			...prev,
			...stepData
		}));
		onNextStep();
	};

	const handlePrevious = (stepData: TStepData) => {
		setData((prev) => ({
			...prev,
			...stepData
		}));
		handlePreviousStep();
	};

	const handleFinish = () => {
		//Reset the flow
		setCurrentStep(0);
		setSteps(initialSteps);
		setData({});
		onFinish?.();
	};

	return (
		<div className="flex flex-col w-full h-full">
			<div className="flex h-10 flex-row items-center justify-between gap-3 hairline-b border-border pb-2">
				{steps.map((step, index) => {
					const isCurrent = index === currentStep;
					const isCompleted = step.isCompleted;
					const isLastStep = index == steps.length - 1;
					const isReachedStep = isCompleted || isCurrent;

					return (
						<div key={step.id} className={cn('flex min-w-0 gap-2 items-center', !isLastStep && 'grow')}>
							<div
								className={cn(
									'flex size-4.5 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground hairline-ring ring-border',
									step.isCompleted && 'bg-success/10 text-success-foreground ring-success/20',
									isCurrent && 'bg-primary text-primary-foreground ring-primary'
								)}
							>
								{step.isCompleted ? (
									<Check className="size-3" />
								) : (
									<span className="text-[11px] font-medium tabular-nums">{step.id}</span>
								)}
							</div>
							<div
								className={cn(
									'min-w-0 truncate text-xs text-muted-foreground',
									isReachedStep && 'font-medium text-foreground'
								)}
							>
								{step.title}
							</div>
							{!isLastStep && <div className="h-px min-w-4 bg-border grow"></div>}
						</div>
					);
				})}
			</div>
			<div className="w-full">
				<AddOrEditContainer
					currentData={data}
					onFinish={handleFinish}
					onNext={handleNext}
					onPrevious={handlePrevious}
					step={currentStep}
					mode={mode}
				>
					<BasicInformationForm />
					<FinancialSettingsForm />
					<CategorizationForm />
					<TeamAndRelationsForm />
					<FinalReview />
				</AddOrEditContainer>
			</div>
		</div>
	);
}
