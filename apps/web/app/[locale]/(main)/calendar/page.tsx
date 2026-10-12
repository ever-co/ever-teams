import { notFound } from 'next/navigation';

// Both calendar views only render sample data (fixed 2024 events, fake members and totals), so the route
// stays hidden until they read real time logs. Nothing in the app links here.
export default function Page() {
	notFound();
}
