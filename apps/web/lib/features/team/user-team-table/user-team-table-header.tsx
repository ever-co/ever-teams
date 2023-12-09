import React from 'react';

function UserTeamTableHeader() {
	return (
		<div className="flex px-4 text-center items-center pt-4">
			<p className="w-1/3 ">Name</p>
			<p className="w-2/5 ">Task</p>
			<p className="w-1/12 ">Worked on Task</p>
			<p className="w-1/4 ">Estimate</p>
			<p className="w-28 ">Action</p>
		</div>
	);
}

export default UserTeamTableHeader;
