import { MemberCardEditableValues } from '@/core/types/interfaces/organization/employee';
import { TUser } from '@/core/types/schemas';
import Image from 'next/image';
import Link from 'next/link';
import { ChangeEventHandler } from 'react';

export function MemberInfo({
	member,
	editMode,
	editable,
	onSubmitName,
	onChangeName
}: {
	member: TUser | undefined;
	editMode: boolean;
	editable: MemberCardEditableValues;
	onSubmitName?: () => void;
	onChangeName: ChangeEventHandler<HTMLInputElement>;
}) {
	return (
		<div className="w-[235px] h-[48px] flex items-center justify-center">
			<div className="flex items-center justify-center">
				<Link href={`/profile/${member?.id}`}>
					<div className="relative w-[48px] h-[48px]">
						<Image
							src={member?.imageUrl || ''}
							alt="User Icon"
							layout="fill"
							objectFit="cover"
							className="rounded-[50%] cursor-pointer h-full w-full"
						/>
					</div>
				</Link>
			</div>

			<div className="w-[137px] mx-[20px] h-[48px] flex justify-start items-center cursor-pointer">
				{editMode === true ? (
					<input
						value={editable.memberName}
						name="memberName"
						onChange={onChangeName}
						onKeyPress={(event) => event.key === 'Enter' && onSubmitName && onSubmitName()}
						className="w-full h-[40px] rounded-lg px-2 shadow-inner border border-[#D7E1EB] dark:border-[#27272A]"
					/>
				) : (
					<Link href={`/profile/${member?.id}`}>
						<div>{editable.memberName}</div>
					</Link>
				)}
			</div>
		</div>
	);
}
