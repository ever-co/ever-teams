import { Button, VerticalSeparator } from '@/lib/components';
import { IStepElementProps } from '../container';
import { Fragment, ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Calendar, Clipboard } from 'lucide-react';
import { useOrganizationProjects, useOrganizationTeams } from '@/app/hooks';
import { IProject } from '@/app/interfaces';

export default function FinalReview(props: IStepElementProps) {
	const { goToNext } = props;

	return (
		<div className="w-full space-y-5 pt-4">
			<div className="w-full flex flex-col gap-6">
				<h2 className=" text-xl font-medium">Review</h2>
				<div className="w-full flex flex-col  gap-8">
					<BasicInformation
						projectTitle="Ever Teams"
						startDate="1.07.2024"
						endDate="7.07.2024"
						websiteUrl="https://dummyimage.com/16:9x1080/"
						projectImageUrl="https://dummyimage.com/16:9x1080/"
						description="This is the project description ..."
					/>
					<FinancialSettings
						budgetAmount="10000"
						billingType="Hourly Rate"
						budgetCurrency="EUR"
						budgetType="Hours"
					/>
					<Categorization
						labels={[
							{ label: 'Development', color: '#26B5CE' },
							{ label: 'Marketing', color: '#F3D8B0' },
							{ label: 'Design', color: '#4192AB' },
							{ label: 'Finance', color: '#D4EFDF' }
						]}
						tags={[
							{ label: 'Urgent', color: '#EB5757' },
							{ label: 'Important', color: '#F2994A' }
						]}
						colorCode="#BB87FC"
					/>
					<TeamAndRelations
						managerIds={['id1', 'id2', 'id3']}
						relations={[
							{
								relation: 'is blocked by',
								projectId: 'id'
							},
							{
								relation: 'is related to',
								projectId: 'id'
							}
						]}
					/>
				</div>
			</div>
			<div className="w-full flex items-center justify-end">
				<Button onClick={goToNext} className=" h-[2.5rem]">
					Create Project
				</Button>
			</div>
		</div>
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
					icon={
						<div
							className={cn(
								'w-5 h-5 rounded-md flex items-center justify-center overflow-hidden',
								!projectImageUrl && 'border'
							)}
						>
							{projectImageUrl ? (
								<Image
									className="h-full w-full object-cover rounded-md"
									src={projectImageUrl}
									alt={projectTitle}
									width={40}
									height={40}
								/>
							) : (
								<span className=" text-xs uppercase">{projectTitle.substring(0, 2)}</span>
							)}
						</div>
					}
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
				{description ? <p className="border rounded-lg text-xs p-3">{description}</p> : <span>-</span>}
			</div>
		</div>
	);
}

/**
 * Financial settings
 */

interface FinancialSettingsProps {
	budgetType: string;
	budgetAmount: string;
	budgetCurrency: string;
	billingType: string;
}
function FinancialSettings(props: FinancialSettingsProps) {
	const { budgetType, budgetAmount, budgetCurrency, billingType } = props;

	const data = [
		{
			key: 'Budget Type',
			value: budgetType
		},
		{
			key: 'Budget Amount',
			value: new Intl.NumberFormat('us-US', {
				useGrouping: true
			}).format(Number(budgetAmount))
		},
		{
			key: 'Billing Type',
			value: billingType
		},
		{
			key: 'Currency',
			value: budgetCurrency
		}
	];

	return (
		<div className="w-full flex gap-5">
			{data.map(({ key, value }, index) => {
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
	labels: {
		label: string;
		color: string;
	}[];
	tags: {
		label: string;
		color: string;
	}[];
	colorCode: string;
}

function Categorization(props: ICategorizationProps) {
	const { labels, tags, colorCode } = props;

	const ItemWithColor = ({ label, color }: { label: string; color: string }) => (
		<div key={label} className="px-1 shrink-0  text-[.65rem] border flex items-center gap-2 rounded">
			<span style={{ backgroundColor: color ?? 'black' }} className="h-2 w-2 rounded-full" />
			<span>{label}</span>
		</div>
	);

	return (
		<div className="w-full flex items-center gap-8 flex-wrap">
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">Labels</p>
				<div className="w-full flex wrap items-center gap-2">
					{labels.length > 0 ? (
						labels.map((el) => {
							return <ItemWithColor key={el.label} {...el} />;
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">Tags</p>
				<div className="w-full flex wrap items-center gap-2">
					{tags.length > 0 ? (
						tags.map((el) => {
							return <ItemWithColor key={el.label} {...el} />;
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">Color Code</p>
				<ItemWithColor color={colorCode} label={colorCode} />
			</div>
		</div>
	);
}

/**
 * Team & Relations
 */

interface ITeamAndRelationsProps {
	managerIds: string[];
	relations: {
		projectId: string;
		relation: string;
	}[];
}

function TeamAndRelations(props: ITeamAndRelationsProps) {
	const { managerIds, relations } = props;

	const { organizationProjects } = useOrganizationProjects();
	const { teams } = useOrganizationTeams();

	const members = teams.flatMap((team) => team.members);

	const ProjectItem = ({ project }: { project: IProject }) => (
		<div key={project.id} className="flex items-center gap-2">
			<div
				className={cn(
					'w-6 h-6 rounded-full flex text-xs items-center justify-center overflow-hidden',
					!project.imageUrl && 'border'
				)}
			>
				{project.imageUrl ? (
					<Image
						className="h-full w-full object-cover rounded-md"
						src={project.imageUrl}
						alt={project.name ?? 'project-name'}
						width={50}
						height={50}
					/>
				) : (
					<span className=" text-xs uppercase">{project.name ?? '-'}</span>
				)}
			</div>
			<span className=" font-medium text-xs">{project.name ?? '-'}</span>
		</div>
	);

	return (
		<div className="w-full flex gap-8 flex-col">
			<div className="flex flex-col gap-2">
				<p className=" text-xs font-medium">Managers</p>
				<div className="w-full flex wrap items-center gap-2">
					{managerIds.length > 0 ? (
						managerIds.map((managerId) => {
							const member = members.find((el) => el.id === managerId) || members[0];

							const memberImgUrl = member.employee.user?.imageUrl;

							const memberName = member.employee.fullName;

							return (
								<div key={member.id} className="flex items-center gap-2">
									<div
										className={cn(
											'w-6 h-6 rounded-full flex text-xs items-center justify-center overflow-hidden',
											!memberImgUrl && 'border'
										)}
									>
										{memberImgUrl ? (
											<Image
												className="h-full w-full object-cover rounded-md"
												src={memberImgUrl}
												alt={memberName}
												width={50}
												height={50}
											/>
										) : (
											<span className=" text-xs uppercase">{memberName}</span>
										)}
									</div>
									<span className=" text-xs">{memberName}</span>
								</div>
							);
						})
					) : (
						<span>-</span>
					)}
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<p className="text-xs font-medium">Relations</p>
				<div className="w-full flex-col flex gap-2">
					{relations.length > 0 ? (
						relations.map((relation) => {
							const project =
								organizationProjects.find((el) => el.id === relation.projectId) ??
								organizationProjects[0];
							return (
								<div key={project.id} className="flex items-center gap-3">
									<ProjectItem project={project} />
									<span className="text-xs italic text-gray-500 min-w-20">{relation.relation}</span>
									<ProjectItem project={project} />
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
