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
      current: "2:15:30",
      estimate: "4:05:00",
      total: " 05:20:59",
      image: "/assets/profiles/ruslan.png",
      admin: true,
    },
    {
      name: "Ramesh Jena",
      status: "inactive",
      task: "Creating the main time recording screen and user table",
      current: "1:40:00",
      estimate: "5:00:00",
      total: "04:10:10",
      image: "/assets/profiles/roska.png",
    },
    {
      name: "Peace Sundri",
      status: "offline",
      task: "Non cumque rem. Tempore ut esse. Delectus accusantium voluptate voluptas.",
      current: "0:30:00",
      estimate: "2:00:00",
      total: "07:34:30",
      image: "/assets/profiles/mukesh.png",
    },
    {
      name: "Kevin Oskow",
      status: "working",
      task: "Lorem Ipsum is simply dummy text of the printing",
      current: "02:25:15",
      estimate: "15:00:00",
      total: "3:30:00",
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
