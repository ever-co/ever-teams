'use client';
import React from 'react';
import { ChevronRight } from 'lucide-react';
const Header: React.FC = () => {
	return (
		<nav className="flex mt-10 gap-10 items-center mr-8 ml-9 w-full max-w-screen-xl text-sm font-bold tracking-tight leading-snug text-gray-400 max-md:mr-2.5 max-md:max-w-full">
			<div className="flex gap-8 items-center self-stretch my-auto min-w-[240px]">
				<div className="flex gap-2 items-center self-stretch my-auto min-w-[240px]">
					<span className="self-stretch my-auto">Dashboard</span>
					<ChevronRight className="self-stretch object-contain w-3 my-auto shrink-0 aspect-square" />
					<span className="self-stretch my-auto">Ever Teams</span>

					<ChevronRight className="self-stretch object-contain w-3 my-auto shrink-0 aspect-square" />
					<span className="self-stretch my-auto font-semibold text-indigo-950">Team Tasks</span>
				</div>
			</div>
		</nav>
	);
};

export default Header;
