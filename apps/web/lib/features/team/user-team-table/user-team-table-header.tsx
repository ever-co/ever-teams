import React from 'react';

function UserTeamTableHeader() {
	return (
		<div className="flex overflow-y-auto px-4 text-center items-center pt-4">
			<p className="min-w-[8rem]  w-1/3 ">Name</p>
			<p className="min-w-[8rem] w-2/5 ">Task</p>
			<p className="min-w-[8rem] w-1/12 ">Worked on Task</p>
			<p className="min-w-[8rem] w-1/4 ">Estimate</p>
			<p className="min-w-[8rem] w-28 ">Action</p>
		</div>
	);
}

export default UserTeamTableHeader;
