import { ReactNode } from "react";
import Footer from "./footer/footer";
import Header from "./header/header";
import Meta from "./Meta";

interface AppLayoutProps {
  children: ReactNode;
  additionalClass?: string;
}

export const AppLayout = (props: AppLayoutProps) => {
  return (
    <>
      <Meta />
      <div className="flex flex-col h-screen justify-between dark:bg-dark_background_color">
        <Header />
        <div className="flex-1 container min-h-min">{props.children}</div>
        <Footer />
      </div>
    </>
  );
};
