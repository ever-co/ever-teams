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
      <div className="flex flex-col h-screen justify-between">
        <Header />
        <div className="">{props.children}</div>
        <Footer />
      </div>
    </>
  );
};
