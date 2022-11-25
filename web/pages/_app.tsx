import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { MutableSnapshot, RecoilRoot } from "recoil";
import { GetServerSidePropsContext } from "next";
import { userState } from "@app/stores";
import { IUser } from "@app/interfaces/IUserData";
import { AppState } from "@components/InitState";

function MyApp({
  Component,
  pageProps,
  user,
}: AppProps & { user: IUser | null }) {
  function initializeState({ set }: MutableSnapshot) {
    set(userState, user);
  }

  return (
    <RecoilRoot initializeState={initializeState}>
      <ThemeProvider attribute="class">
        <AppState />
        <Component {...pageProps} />
      </ThemeProvider>
    </RecoilRoot>
  );
}

MyApp.getInitialProps = ({ ctx }: { ctx: GetServerSidePropsContext }) => {
  let user = null;
  try {
    user = JSON.parse(ctx.res.getHeader("x-user") as string);
  } catch (_) {}
  return { user };
};

export default MyApp;
