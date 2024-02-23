import { notFound } from 'next/navigation';

export default function CatchAllPage() {
	notFound();
}

export async function generateStaticParams() {
	return [{ locale: 'en', rest: [] }];
}
