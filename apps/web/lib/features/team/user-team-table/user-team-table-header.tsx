import { fullWidthState } from '@app/stores/fullWidth';
import { clsxm } from '@app/utils';
import React from 'react';
import { useRecoilValue } from 'recoil';

function UserTeamTableHeader() {
	const fullWidth = useRecoilValue(fullWidthState);
	return (
		<div className="flex font-normal dark:text-[#7B8089] px-8 bg-white  dark:bg-dark-high  pb-[18px]  mb-[11px]  text-center items-center pt-3">
			<p className="min-w-[8rem] 2xl:w-[20.625rem] w-1/4">Team Member</p>
			<p className="min-w-[8rem] flex-1 ">Task</p>
			<p className={clsxm('min-w-[8rem] w-1/5', fullWidth ? '2xl:w-52 3xl:w-[17rem]' : '2xl:w-48 3xl:w-[12rem]')}>
				Worked on <br/> Task
			</p>
			<p className="min-w-[8rem] w-1/5 2xl:w-48 3xl:w-[12rem] text-center">Estimate</p>
			<p className="text-center">Action</p>
		</div>
	);
}

export default UserTeamTableHeader;
