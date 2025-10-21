import { secondsToTime } from '@/core/lib/helpers/index';
import Link from 'next/link';
import { useMemo } from 'react';
import { ProgressBar } from '../../duplicated-components/_progress-bar';
import { TActivity } from '@/core/types/schemas';

const VisitedItem = ({ app, totalMilliseconds, type }: { app: TActivity; totalMilliseconds: number; type: string }) => {
	const {
		hours: h,
		minutes: m,
		seconds: s
	} = app?.duration ? secondsToTime(+app.duration) : { hours: 0, minutes: 0, seconds: 0 };
	const percent = app?.duration && ((+app.duration * 100) / totalMilliseconds).toFixed(2);

	const itemCellsWidth = useMemo(
		() => ({
			apps: '20%',
			'visited-dates': '25%',
			'percent-used': '40%',
			'time-spent-in-hours': '15%'
		}),
		[]
	);

	return (
		<div className="flex ">
			<p style={{ flexBasis: itemCellsWidth['apps'] }} className="">
				{type == 'SITE' ? <Link href={app?.title ?? ''}>{app?.title}</Link> : <span>{app?.title}</span>}
			</p>
			{app?.date && (
				<p style={{ flexBasis: itemCellsWidth['visited-dates'] }} className="">
					{new Intl.DateTimeFormat('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					}).format(new Date(app?.date))}
					{'  '}
					{app?.time}
				</p>
			)}
			<div style={{ flexBasis: itemCellsWidth['percent-used'] }} className="flex gap-6">
				<p className="overflow-hidden min-w-12 max-w-14">
					{percent ? `${Number(percent).toPrecision(2)}%` : '0%'}
				</p>
				<ProgressBar backgroundColor="black" progress={percent + '%'} width={`75%`} />
			</div>
			<p
				style={{ flexBasis: itemCellsWidth['time-spent-in-hours'] }}
				className=""
			>{`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`}</p>
		</div>
	);
};

export default VisitedItem;
