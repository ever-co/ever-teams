import React from 'react';
interface isProps {
	status: 'Member' | 'Left' | 'Suspended';
}
export const MemberTableStatus = ({ status }: isProps) => {
	return <RenderStatus status={status} />;
};

const RenderStatus = ({ status }: isProps) => {
	switch (status) {
		case 'Member':
			return (
				<div className="flex items-center bg-[#D4EFDF] justify-center rounded-xl w-24 h-8 text-[#5D846D] dark:text-whit font-medium">
					{status}
				</div>
			);
		case 'Left':
			return (
				<div className="flex items-center bg-[#ECE8FC] justify-center rounded-xl w-24 h-8 text-[#7C5D84] font-medium">
					{status}
				</div>
			);
		case 'Suspended':
			return (
				<div className="flex items-center bg-[#F5B8B8] justify-center rounded-xl w-24 h-8 text-[#A44A36] font-medium">
					{status}
				</div>
			);
	}
};
