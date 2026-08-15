import BuilderPageWrapper from './builder-page-wrapper';

export default async function BuilderPage({
	params,
}: {
	params: Promise<{ page?: string[] }>;
}) {
	const resolvedParams = await params;

	const pageSegments = resolvedParams.page ?? [];

	return <BuilderPageWrapper pageParams={pageSegments} />;
}
