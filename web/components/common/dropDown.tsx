import React, { useState } from "react";
import { Combobox } from "@headlessui/react";

interface IDropDownProps {
  data: string[];
  selectedData: string;
  handleSelectData: any;
}

const DropDown = ({ data, handleSelectData, selectedData }: IDropDownProps) => {
  const [query, setQuery] = useState("");

  const filteredData =
    query === ""
      ? data
      : data.filter((value) => {
          return value.toLowerCase().includes(query.toLowerCase());
        });

  return (
    <Combobox value={selectedData} onChange={handleSelectData}>
      <Combobox.Input onChange={(event) => setQuery(event.target.value)} />
      <Combobox.Options>
        {filteredData.map((singleData) => (
          <Combobox.Option key={singleData} value={singleData}>
            {singleData}
          </Combobox.Option>
        ))}
      </Combobox.Options>
    </Combobox>
  );
};

export default DropDown;
