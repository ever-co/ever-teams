import { AppLayoutProps } from "../../app/interfaces/hooks";
import Footer from "./footer/footer";
import Header from "./header/header";
import Meta from "./Meta";

export const AppLayout = (props: AppLayoutProps) => {
  return (
    <>
      <Meta />
      <div className="flex flex-col h-screen justify-between">
        <Header />
        <div className="flex-1 container min-h-min">{props.children}</div>
        <Footer />
      </div>
    </>
  );
};
