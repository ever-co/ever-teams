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
      <div className="flex flex-col h-screen justify-between bg-[#f5f5f5]">
        <Header />
        <div className="flex-1 container">{props.children}</div>
        <Footer />
      </div>
    </>
  );
};
