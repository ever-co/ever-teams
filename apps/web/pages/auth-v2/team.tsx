import Card from 'lib/components/card';
import Footer from 'lib/layout/footer';

export default function AuthTeam() {
	return (
		<div className="flex flex-col items-center h-screen min-h-[500px] justify-between w-full">
			<Card className="w-1/2 h-64" shadow="bigger" />
			<Footer />
		</div>
	);
}
