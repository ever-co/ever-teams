'use client';
import { useModal } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Button, Text } from '@/core/components';
import React, { PropsWithChildren } from 'react';
import { useTranslations } from 'next-intl';
import { Tooltip } from '../duplicated-components/tooltip';
import { CreateTeamModal } from '../features/teams/create-team-modal';
import { organizationTeamsState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { NoTeamIcon } from '@/assets/svg';

type Props = PropsWithChildren & React.ComponentPropsWithRef<'div'>;
const NoTeam = ({ className, ...rest }: Props) => {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();
	const { data: user } = useUserQuery();

	const teams = useAtomValue(organizationTeamsState);

	React.useEffect(() => {
		closeModal();
		if (teams.length < 1 && user?.isEmailVerified == true) openModal();
	}, [closeModal, openModal, teams.length, user?.isEmailVerified]);

	return (
		<div className={clsxm('flex flex-col justify-center items-center mx-auto mt-8 xs:mt-32', className)} {...rest}>
			<NoTeamIcon className="size-[70px] mb-4 bg-transparent" />
			<Text.Heading as="h3" className="mb-4 text-2xl font-medium text-center">
				{t('common.NO_TEAM')}
			</Text.Heading>
			<div className="w-full mx-auto text-center xs:w-5/12">
				<p className="font-medium opacity-40 text-default dark:text-light--theme-dark">
					{t('common.NO_TEAM_SUB')}
				</p>
			</div>

			<Tooltip placement="auto" label={t('common.NO_TEAM_TOOLTIP')} enabled={user?.isEmailVerified == false}>
				<Button
					className="mt-10 text-base font-medium capitalize"
					onClick={openModal}
					disabled={user?.isEmailVerified == false}
				>
					{t('common.CREATE_TEAM')}
				</Button>
			</Tooltip>
			<CreateTeamModal open={isOpen} closeModal={closeModal} />
		</div>
	);
};

export default NoTeam;
