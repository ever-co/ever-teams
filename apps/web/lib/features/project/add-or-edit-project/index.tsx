import { Card, Modal } from '@/lib/components';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddOrEditContainer, { TStepData } from './container';
import TeamAndRelationsForm from './steps/team-and-relations-form';
import BasicInformationForm from './steps/basic-information-form';
import CategorizationForm from './steps/categorization-form';
import FinancialSettingsForm from './steps/financial-settings-form';
import FinalReview from './steps/review-summary';
import { useTranslations } from 'next-intl';
import {
	OrganizationProjectBudgetTypeEnum,
	ProjectBillingEnum,
	ProjectOwnerEnum,
	TaskStatusEnum
} from '@/app/interfaces';
import { useOrganizationProjects } from '@/app/hooks';
import { useRoles } from '@/app/hooks/features/useRoles';
import { RolesEnum } from '@/app/interfaces/IRoles';

export type TModalMode = 'edit' | 'create';

interface IAddOrEditProjectModalProps {
	open: boolean;
	closeModal: () => void;
	mode?: TModalMode;
	projectId?: string;
}

export default function AddOrEditProjectModal(props: IAddOrEditProjectModalProps) {
	const { open, closeModal, mode = 'create', projectId } = props;
	const t = useTranslations();
	const { organizationProjects } = useOrganizationProjects();
	const project = useMemo(
		() => organizationProjects.find((el) => el.id === projectId),
		[organizationProjects, projectId]
	);
	const { roles } = useRoles();

	const simpleMemberRole = roles?.find((role) => role.name == RolesEnum.EMPLOYEE);
	const managerRole = roles?.find((role) => role.name == RolesEnum.MANAGER);

	// Initialize step data
	const handleInitStepData = (): Omit<TStepData, 'organizationId' | 'tenantId' | 'projectImage'> => {
		const initialValues = {
			name: '',
			budgetType: OrganizationProjectBudgetTypeEnum.HOURS,
			description: '',
			memberIds: [],
			managerIds: [],
			labels: [],
			tags: [],
			startDate: '',
			endDate: '',
			billing: ProjectBillingEnum.FLAT_FEE,
			currency: '',
			imageUrl: '',
			imageId: '',
			relations: [],
			color: '#000',
			website: '',
			teams: [],
			isActive: true,
			isArchived: false,
			isTasksAutoSync: false,
			isTasksAutoSyncOnLabel: false,
			status: TaskStatusEnum.OPEN,
			owner: ProjectOwnerEnum.CLIENT
		};
		if (mode === 'create') {
			return initialValues;
		} else if (mode === 'edit' && project !== undefined) {
			const projectData = {
				...project,
				members:
					project.members?.map((el) => ({
						id: `${el.id}-${String(el.role)}`,
						memberId: el.employeeId,
						roleId: el.isManager ? managerRole?.id : simpleMemberRole?.id
					})) || [],
				tags: project.tags?.map((el) => el.id),

				relations: []
			} as TStepData;
			return projectData;
		} else {
			return initialValues;
		}
	};

	const initialSteps = [
		{ id: 1, title: t('pages.projects.addOrEditModal.steps.createProject'), isCompleted: false },
		{ id: 2, title: t('pages.projects.addOrEditModal.steps.financialSettings'), isCompleted: false },
		{ id: 3, title: t('pages.projects.addOrEditModal.steps.categorization'), isCompleted: false },
		{ id: 4, title: t('pages.projects.addOrEditModal.steps.teamAndRelations'), isCompleted: false }
	];

	const [steps, setSteps] = useState(initialSteps);
	const [currentStep, setCurrentStep] = useState(0);
	const [data, setData] = useState<TStepData>(handleInitStepData);

	const onNextStep = useCallback(() => {
		if (currentStep < steps.length - 1) {
			const updatedSteps = [...steps];
			updatedSteps[currentStep].isCompleted = true;
			updatedSteps[currentStep + 1].isCompleted = false;
			setCurrentStep(currentStep + 1);
			setSteps(updatedSteps);
		}

		if (currentStep === steps.length - 1) {
			const updatedSteps = [...steps];
			updatedSteps[currentStep].isCompleted = true;
			setCurrentStep(currentStep + 1);
			setSteps(updatedSteps);
		}
	}, [currentStep, steps]);

	const handleNext = (stepData: TStepData) => {
		setData((prev) => ({
			...prev,
			...stepData
		}));
		onNextStep();
	};

	const handleFinish = () => {
		//Reset the flow
		setCurrentStep(0);
		setSteps(initialSteps);
		setData({});
		closeModal();
	};

	useEffect(() => {
		console.log('first');
	}, []);

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
										'h-4 w-4 shrink-0 bg-gray-400 flex items-center justify-center rounded-full text-white',
										step.isCompleted && 'bg-green-700 text-white',
										isCurrent && 'bg-primary text-primary-foreground'
									)}
								>
									{step.isCompleted ? (
										<Check size={10} />
									) : (
										<span className=" text-xs">{step.id}</span>
									)}
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
					<AddOrEditContainer
						currentData={data}
						onFinish={handleFinish}
						onNext={handleNext}
						step={currentStep}
						mode={mode}
					>
						{
							//@ts-ignore
							<BasicInformationForm />
						}
						{
							//@ts-ignore
							<FinancialSettingsForm />
						}
						{
							//@ts-ignore
							<CategorizationForm />
						}
						{
							//@ts-ignore
							<TeamAndRelationsForm />
						}
						{
							//@ts-ignore
							<FinalReview />
						}
					</AddOrEditContainer>
				</div>
			</Card>
		</Modal>
	);
}
