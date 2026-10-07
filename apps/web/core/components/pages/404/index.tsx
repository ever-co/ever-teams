'use client';
import { Button, Text } from '@/core/components';
import Link from 'next/link';
import { moduleConstantsSawRuntimeEnv } from '@/env-config';
// import { useTranslations } from 'next-intl';

function NotFound() {
	// const t = useTranslations();
	return (
		<div className="flex flex-col items-center justify-center w-screen h-screen  dark:bg-black">
			<div className="flex flex-col items-center justify-center gap-6">
				<div className="flex items-center justify-center gap-4 text-center rounded-full  w-52 h-52 bg-black/10">
					{/* <SadCry width={97} height={97} /> */}
					<Text className="text-6xl font-semibold text-primary">404</Text>
				</div>

				<div className="flex flex-col items-center justify-center gap-5">
					<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
						Page Not found !{/* {t('pages.notFound.TITLE')} */}
					</Text>

					<Text className="font-light text-center text-gray-400 ">
						Resource you are looking for is not found !
					</Text>

					{/*
					 * Next renders some documents without app/layout.tsx — its own `<html id="__next_error__">`
					 * shell, client-rendered after an SSR error or a notFound() raised during SSR (/foo.bar,
					 * whose dotted first segment proxy.ts's matcher skips). They carry no runtime env, so this
					 * bundle's module-level constants are frozen at the build-time defaults. Leave such a
					 * document with a full page load: a soft navigation would carry Ever's branding, captcha
					 * type and demo flags into a self-hosted app until the next reload.
					 */}
					<Button className="m-auto font-normal rounded-lg ">
						{moduleConstantsSawRuntimeEnv() ? (
							<Link href="/">Go back to home</Link>
						) : (
							<a href="/">Go back to home</a>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}

export default NotFound;
