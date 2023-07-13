import type { NextPage } from "next";
import TeamLogo from "../components/main_logo";

const Home: NextPage = () => {
  return (
    <section className="flex flex-col items-center justify-center h-screen">
      <div className="my-5">
        <TeamLogo />
      </div>
      <h1 className="text-3xl font-bold">Ever Teams</h1>
    </section>
  );
};

export default Home;
