import React from 'react';

function UserTeamTableHeader() {
	return (
		<div className="flex overflow-y-auto px-4 text-center items-center pt-4">
			<p className="min-w-[8rem] 2xl:w-[20.625rem] w-1/4">Name</p>
			<p className="min-w-[8rem] flex-1 ">Task</p>
			<p className="min-w-[8rem] w-1/5 2xl:w-48 3xl:w-[12rem]">Worked on Task</p>
			<p className="min-w-[8rem] w-1/5 2xl:w-52 3xl:w-[14rem] text-center">Estimate</p>
			<p className="min-w-[8rem] w-28 self-end text-end">Action</p>
		</div>
	);
}

export default UserTeamTableHeader;
