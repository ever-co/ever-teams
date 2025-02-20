import { Button, VerticalSeparator } from '@/lib/components';
import { Fragment, ReactNode, useCallback } from 'react';
import { Calendar, Clipboard } from 'lucide-react';
import { useAuthenticateUser, useImageAssets, useOrganizationProjects, useOrganizationTeams } from '@/app/hooks';
import { Thumbnail } from './basic-information-form';
import moment from 'moment';
import {
	ICreateProjectInput,
	ILabel,
	IProjectRelation,
	ITag,
	OrganizationProjectBudgetTypeEnum,
	ProjectBillingEnum
} from '@/app/interfaces';
import { IStepElementProps } from '../container';

export default function FinalReview(props: IStepElementProps) {
	const { finish, currentData: finalData } = props;
	const { createOrganizationProject, createOrganizationProjectLoading } = useOrganizationProjects();
	const { createImageAssets } = useImageAssets();
	const { user } = useAuthenticateUser();

	const newProject: Partial<ICreateProjectInput> = {
		name: finalData?.name,
		startDate: moment(finalData?.startDate).toISOString(),
		endDate: moment(finalData?.startDate).toISOString(),
		website: finalData?.website,
		description: finalData?.description,
		imageUrl: finalData?.imageUrl ?? undefined,
		tags: finalData?.tags,
		color: finalData?.color ?? '#000',
		managerIds: finalData?.managerIds ?? [],
		memberIds: finalData?.memberIds ?? [],
		budget: finalData?.budget,
		currency: finalData?.currency,
		budgetType: finalData?.budgetType,
		billing: finalData?.billing
	};

	const createProjectImage = useCallback(
		async (file: File) => {
			return createImageAssets(
				file,
				'project_images',
				user?.tenantId as string,
				user?.employee?.organizationId as string
			).then((image) => {
				return image;
			});
		},
		[user, createImageAssets]
	);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const projectImage = finalData?.projectImageFile && (await createProjectImage(finalData?.projectImageFile));

		console.log(projectImage);

		const project = await createOrganizationProject({
			...newProject,
			imageUrl: projectImage?.fullUrl,
			imageId: projectImage?.id
		});

		if (project) {
			finish(project);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-5 pt-4">
			<div className="w-full flex flex-col gap-6">
				<h2 className=" text-xl font-medium">Review</h2>
				<div className="w-full flex flex-col  gap-8">
					<BasicInformation
						projectTitle={finalData?.name ?? '-'}
						startDate={moment(finalData?.startDate).format('D.MM.YYYY')}
						endDate={moment(finalData?.endDate).format('D.MM.YYYY')}
						websiteUrl={finalData?.website}
						projectImageUrl={
							finalData?.projectImageFile ? URL.createObjectURL(finalData?.projectImageFile) : undefined
						}
						description={finalData?.description}
					/>
					<FinancialSettings
						budgetAmount={finalData?.budget}
						billingType={finalData?.billing}
						budgetCurrency={finalData?.currency}
						budgetType={finalData?.budgetType}
					/>
					<Categorization labels={finalData?.labels} tags={finalData?.tags} colorCode={finalData?.color} />
					<TeamAndRelations
						projectTitle={finalData?.name}
						projectImgUrl={
							finalData?.projectImageFile ? URL.createObjectURL(finalData?.projectImageFile) : undefined
						}
						managerIds={finalData?.managerIds}
						relations={finalData?.relations}
					/>
				</div>
			</div>
			<div className="w-full flex items-center justify-end">
				<Button loading={createOrganizationProjectLoading} type="submit" className=" h-[2.5rem]">
					Create Project
				</Button>
			</div>
		</form>
	);
}

interface IAttribute {
	_key: string;
	value?: ReactNode;
	icon?: ReactNode;
}
function Attribute(props: IAttribute) {
	const { _key, value, icon } = props;
	return (
		<div className="flex min-w-[6rem] text-xs flex-col justify-between  gap-2 items-start">
			<div className="font-medium">{_key}</div>
			<div className="flex items-center text-gray-500  gap-1">
				{value ? (
					<>
						{icon ? icon : null} <span>{value}</span>
					</>
				) : (
					<span>-</span>
				)}
			</div>
		</div>
	);
}

/**
 * Basic Information
 */

interface IBasicInformationProps {
	projectTitle: string;
	projectImageUrl?: string;
	startDate?: string;
	endDate?: string;
	websiteUrl?: string;
	description?: string;
}
function BasicInformation(props: IBasicInformationProps) {
	const { projectTitle, projectImageUrl, description, startDate, endDate, websiteUrl } = props;
	return (
		<div className="w-full flex flex-col gap-8">
			<div className="w-full flex gap-5">
				<Attribute
					_key="Project Title"
					icon={<Thumbnail imgUrl={projectImageUrl} size={'20px'} identifier={projectTitle} />}
					value={projectTitle}
				/>
				<VerticalSeparator />
				<Attribute _key="Start Date" value={startDate} icon={<Calendar size={10} />} />
				<Attribute _key="End Date" value={endDate} icon={<Calendar size={10} />} />
				<VerticalSeparator />
				<Attribute
					_key="Website URL"
					value={
						<div className="flex items-center gap-1">
							{websiteUrl ? (
								<>
									<Clipboard size={10} /> <span>{websiteUrl}</span>
								</>
							) : (
								<span>-</span>
							)}
						</div>
					}
				/>
			</div>

			<div className="w-full flex flex-col gap-2">
				<span className="text-xs font-medium">Description</span>
				{description ? <p className="border min-h-20 rounded-lg text-xs p-3">{description}</p> : <span>-</span>}
			</div>
		</div>
	);
}

/**
 * Financial settings
 */

interface FinancialSettingsProps {
	budgetType?: OrganizationProjectBudgetTypeEnum;
	budgetAmount?: number;
	budgetCurrency?: string;
	billingType?: ProjectBillingEnum;
}
function FinancialSettings(props: FinancialSettingsProps) {
	const { budgetType, budgetAmount, budgetCurrency, billingType } = props;

	const data = [
		{
			key: 'Budget Type',
			value: budgetType ?? '-'
		},
		{
			key: 'Budget Amount',
			value: budgetAmount
				? new Intl.NumberFormat('us-US', {
						useGrouping: true
					}).format(Number(budgetAmount))
				: '-'
		},
		{
			key: 'Billing Type',
			value: billingType ?? '-'
		},
		{
			key: 'Currency',
			value: budgetCurrency ?? '-'
		}
	];

	return (
		<div className="w-full flex gap-5">
			{data?.map(({ key, value }, index) => {
				const isLastItem = index === data.length - 1;

				return (
					<Fragment key={index}>
						<Attribute _key={key} value={value} key={index} />

						{isLastItem ? null : <VerticalSeparator />}
					</Fragment>
				);
			})}
		</div>
	);
}

/**
 * Categorization
 */

interface ICategorizationProps {
	labels?: Omit<ILabel, 'id'>[];
	tags?: ITag[];
	colorCode?: string;
}

function Categorization(props: ICategorizationProps) {
	const { labels, tags, colorCode } = props;

	const ItemWithColor = ({ label, color }: { label: string; color: string }) => (
		<div key={label} className="px-1 shrink-0  text-[.7rem] border flex items-center gap-2 rounded">
			<span style={{ backgroundColor: color ?? 'black' }} className="h-[10px] w-[10px] rounded-full" />
			<span>{label}</span>
		</div>
	);

	return (
		<div className="w-full flex items-center gap-8 flex-wrap">
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">Labels</p>
				<div className="w-full flex wrap items-center gap-2">
					{labels?.length ? (
						labels?.map((el) => {
							return <ItemWithColor key={el.name} label={el.name} color={el.color} />;
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">Tags</p>
				<div className="w-full flex wrap items-center gap-2">
					{tags?.length ? (
						tags?.map((el) => {
							return <ItemWithColor key={el.name} label={el.name} color={el.color} />;
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">Color Code</p>
				<ItemWithColor color={colorCode ?? 'black'} label={colorCode ?? '-'} />
			</div>
		</div>
	);
}

/**
 * Team & Relations
 */

interface ITeamAndRelationsProps {
	managerIds?: string[];
	relations?: IProjectRelation[];
	projectImgUrl?: string;
	projectTitle?: string;
}

function TeamAndRelations(props: ITeamAndRelationsProps) {
	const { managerIds, relations, projectImgUrl, projectTitle } = props;

	const { organizationProjects } = useOrganizationProjects();
	const { teams } = useOrganizationTeams();

	const members = teams?.flatMap((team) => team.members);

	const Item = ({ name, imgUrl }: { name: string; imgUrl?: string }) => (
		<div className="flex items-center gap-2">
			<Thumbnail className="rounded-full" size={'24px'} identifier={name} imgUrl={imgUrl} />
			<span className=" font-medium text-xs">{name}</span>
		</div>
	);

	return (
		<div className="w-full flex gap-8 flex-col">
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">Managers</p>
				<div className="w-full flex wrap items-center gap-2">
					{managerIds?.length ? (
						managerIds?.map((managerId) => {
							const member = members.find((el) => el.employeeId === managerId);

							const memberImgUrl = member?.employee.user?.imageUrl;

							const memberName = member?.employee.fullName;

							return <Item key={member?.id} name={memberName ?? '-'} imgUrl={memberImgUrl} />;
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<p className="text-xs font-medium">Relations</p>
				<div className="w-full flex-col flex gap-2">
					{relations?.length ? (
						relations?.map((relation) => {
							const project = organizationProjects?.find((el) => el.id === relation.projectId);
							return (
								<div key={project?.id} className="flex items-center gap-3">
									<Item name={projectTitle ?? '-'} imgUrl={projectImgUrl} />
									<span className="text-xs italic text-gray-500 min-w-20">
										{relation.relationType}
									</span>
									<Item imgUrl={project?.imageUrl ?? undefined} name={project?.name ?? '-'} />
								</div>
							);
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
		</div>
	);
}
