import classNames from 'classnames';
import logoImg from 'data-base64:~assets/logo/ever-teams-dark.png';
import React, { FC, useState } from 'react';

import AppDropdown from '~components/shared/AppDropdown';
import { textEllipsis } from '~misc/tailwindClasses';
import type { ITeam } from '~typescript/types/Team';

const teams: ITeam[] = [{ id: 1, title: 'Team' }];

const Header: FC = () => {
	const [team, setTeam] = useState<ITeam>(teams[0]);

	const onTeamSelect = (team: ITeam) => {
		setTeam(team);
	};

	return (
		<div className="flex items-center justify-between mb-4">
			<img className="w-32 h-full" src={logoImg}></img>
			<div className="flex items-center min-w-[180px] text-end">
				<span className="mr-2">Team:</span>
				<AppDropdown
					buttonTitle={team.title}
					buttonClassNames={classNames(
						'text-white bg-slate-800 hover:bg-slate-700 focus:outline-none font-medium rounded-lg text-sm px-4 py-2.5 text-center',
						textEllipsis,
						'w-36'
					)}
					options={teams}
					onOptionSelect={onTeamSelect}
					optionContainerClassNames="-ml-8"
				/>
			</div>
		</div>
	);
};

export default Header;
