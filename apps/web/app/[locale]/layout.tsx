import { notFound } from "next/navigation";

// Can be imported from a shared config
const locales = ["en", "de"];

export default function LocaleLayout({ children, params: { locale } }: any) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
