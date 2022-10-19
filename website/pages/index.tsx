import type { NextPage } from "next";
import TeamLogo from "../components/main_logo";

const Home: NextPage = () => {
  return (
    <section className="flex flex-col justify-center items-center h-screen">
      <div className="my-5">
        <TeamLogo />
      </div>
      <h1 className="text-3xl font-bold flex items-center justify-center">
        Gauzy Teams
      </h1>
    </section>
  );
};

export default Home;
