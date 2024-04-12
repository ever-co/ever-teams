import { fullWidthState } from '@app/stores/fullWidth';
import { clsxm } from '@app/utils';
import React from 'react';
import { useRecoilValue } from 'recoil';

function UserTeamTableHeader() {
	const fullWidth = useRecoilValue(fullWidthState);
	// return (
	// 	<div className="flex font-normal dark:text-[#7B8089] px-8 dark:bg-dark-high  pb-[18px]  mb-[11px]  text-center items-center pt-3">
	// 		<p className="min-w-[8rem] 2xl:w-[20.625rem] w-1/4">Team Member</p>
	// 		<p className="min-w-[8rem] flex-1 ">Task</p>
	// 		<p className={clsxm('min-w-[8rem] w-1/5', fullWidth ? '2xl:w-52 3xl:w-[17rem]' : '2xl:w-48 3xl:w-[12rem]')}>
	// 			Worked on <br/> Task
	// 		</p>
	// 		<p className="min-w-[8rem] w-1/5 2xl:w-48 3xl:w-[12rem] text-center">Estimate</p>
	// 		<p className="text-center">Action</p>
	// 	</div>
	// );
	return (
		<thead className="font-normal h-[92px] w-full dark:text-[#7B8089] bg-dark-high px-8 pb-[18px] mb-[11px] pt-3">
      <tr className="text-center w-full items-center">
        <th className="w-[32%] 2xl:!w-[28%] pl-10 font-normal text-left">Team Member</th>
        <th className="!w-[39%] font-normal">Task</th>
        <th className={`!w-[16%] font-normal`}>
          Worked on <br/> Task
        </th>
        <th className="!w-[16%] font-normal">Estimate</th>
        <th className="!w-[50%] font-normal">Action</th>
      </tr>
    </thead>
	)
}

export default UserTeamTableHeader;
