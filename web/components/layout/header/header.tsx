import React from "react";

const Header = () => (
  <div className="h-10 flex justify-between px-6">
    <div className="flex">
      <h3 className="text-primary mr-2 text-xl">Gauzy Team</h3>
      {"-"}
      <h3 className="ml-2">Super Team</h3>
    </div>
    <div className="flex justify-between">
      <h3 className="text-primary">Welcome</h3>
      {", "}
      <h3 className="ml-1">Serge Muhundu</h3>
    </div>
  </div>
);

export default Header;
