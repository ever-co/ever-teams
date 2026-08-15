export default function NotFound() {
	return (
		<main className="flex flex-col justify-center items-center gap-2 min-h-[70vh]">
			<p className="text-9xl">404</p>
			<p className="text-xl text-gray-400 ">
				Page not found, Go to{' '}
				<a href={'/'} className="hover:underline dark:hover:text-white hover:text-black">
					home
				</a>
			</p>
		</main>
	);
}
