import Header from "./header";
import { IMembers, IStartSection } from "../../app/interfaces/hooks";
import Card from "../main/card";
import InviteCard from "../main/invite-card";

const TeamMemberSection = ({ started, setStarted }: IStartSection) => {
  const members: IMembers[] = [
    {
      name: "Raslan Kanviser",
      status: "working",
      task: "Similique et soluta voluptatem voluptatem. Dolor facere eos sit nisi ipsa eveniet.",
      current: "2h:15m",
      estimate: { hours: 12, minutes: 20 },
      total: " 05h:20m",
      image: "/assets/profiles/ruslan.png",
      admin: true,
    },
    {
      name: "Ramesh Jena",
      status: "inactive",
      task: "Creating the main time recording screen and user table",
      current: "1h:40m",
      estimate: { hours: 2, minutes: 20 },
      total: "4h:10m",
      image: "/assets/profiles/roska.png",
    },
    {
      name: "Peace Sundri",
      status: "offline",
      task: "Non cumque rem. Tempore ut esse. Delectus accusantium voluptate voluptas.",
      current: "0h:30m",
      estimate: { hours: 2, minutes: 0 },
      total: "7h:34m",
      image: "/assets/profiles/mukesh.png",
    },
    {
      name: "Kevin Oskow",
      status: "working",
      task: "Lorem Ipsum is simply dummy text of the printing",
      current: "2h:25m",
      estimate: { hours: 15, minutes: 0 },
      total: "3h:30m",
      image: "/assets/profiles/kevin.png",
    },
  ];
  const style = { width: `${100 / members.length}%` };
  return (
    <div className="mt-[72px]">
      <ul className="w-full">
        <Header style={style} />
        {members.map((item, i) => (
          <li key={i}>
            <Card
              current={item.current}
              task={item.task}
              length={members.length}
              i={i}
              style={style}
              estimate={item.estimate}
              name={item.name}
              status={item.status}
              total={item.total}
              image={item.image}
              admin={item.admin}
              started={started}
              setStarted={setStarted}
            />
          </li>
        ))}
        <li>
          <InviteCard />
        </li>
      </ul>
    </div>
  );
};
export default TeamMemberSection;
