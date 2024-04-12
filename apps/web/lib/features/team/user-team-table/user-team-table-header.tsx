import React from 'react';

function UserTeamTableHeader() {
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
