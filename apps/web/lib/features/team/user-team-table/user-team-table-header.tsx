import { fullWidthState } from '@app/stores/fullWidth';
import { clsxm } from '@app/utils';
import React from 'react';
import { useRecoilValue } from 'recoil';

function UserTeamTableHeader() {
	const fullWidth = useRecoilValue(fullWidthState);
	return (
		<div className="flex overflow-y-auto px-0 pb-4 mt-10 text-center items-center pt-4">
			<p className="min-w-[8rem] 2xl:w-[20.625rem] w-1/4">Name</p>
			<p className="min-w-[8rem] flex-1 ">Task</p>
			<p className={clsxm('min-w-[8rem] w-1/5', fullWidth ? '2xl:w-52 3xl:w-[17rem]' : '2xl:w-48 3xl:w-[12rem]')}>
				Worked on Task
			</p>
			<p className="min-w-[8rem] w-1/5 2xl:w-48 3xl:w-[12rem] text-center">Estimate</p>
			<p className="self-end text-end">Action</p>
		</div>
	);
}

export default UserTeamTableHeader;
