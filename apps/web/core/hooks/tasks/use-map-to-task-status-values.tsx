/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
// import { LoginIcon, RecordIcon } from 'lib/components/svgs';
import { useMemo } from 'react';
import Image from 'next/legacy/image';
import { TTaskStatus } from '@/core/types/schemas';
import { TStatus } from '@/core/types/interfaces/task/task-card';

export function useMapToTaskStatusValues<T extends TTaskStatus>(data: T[], bordered = false): TStatus<any> {
	return useMemo(() => {
		return data.reduce((acc, item) => {
			const value: TStatus<any>[string] = {
				id: item.id,
				name: item.name?.split('-').join(' '),
				realName: item.name?.split('-').join(' '),
				value: item.value || item.name,
				bgColor: item.color,
				bordered,
				icon: (
					<div className="flex relative items-center">
						{item.fullIconUrl && (
							<Image layout="fixed" src={item.fullIconUrl} height="20" width="16" alt={item.name} />
						)}
					</div>
				)
			};

			if (value.value) {
				acc[value.value] = value;
			} else if (value.name) {
				acc[value.name] = value;
			}
			return acc;
		}, {} as TStatus<any>);
	}, [data, bordered]);
}
