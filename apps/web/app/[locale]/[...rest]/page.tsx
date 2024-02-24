import { APPLICATION_DEFAULT_LANGUAGE } from '@app/constants';
import { notFound } from 'next/navigation';

export default function CatchAllPage() {
	notFound();
}

export async function generateStaticParams() {
	return [{ locale: APPLICATION_DEFAULT_LANGUAGE, rest: [] }];
}
