import { secondsToTime } from "@app/helpers/date";
import { useTeamTasks } from "@app/hooks/useTeamTasks";
import { TimeInput } from "@components/common/main/time-input";
import { Spinner } from "@components/common/spinner";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

export function EstimateTime() {
  const { activeTeamTask, updateTask, updateLoading } = useTeamTasks();
  const [value, setValue] = useState({ hours: "", minutes: "" });

  useEffect(() => {
    const { h, m } = secondsToTime(activeTeamTask?.estimate || 0);
    setValue({
      hours: h.toString(),
      minutes: m.toString(),
    });
  }, [activeTeamTask]);

  const onChange = useCallback((c: keyof typeof value) => {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const tm = +e.currentTarget.value.trim();
      const isInteger = !isNaN(tm) && Number.isInteger(tm);

      switch (c) {
        case "hours":
          if (!isInteger || tm < 0 || tm > 999) {
            return;
          }
          break;
        case "minutes":
          if (!isInteger || tm < 0 || tm > 60) {
            return;
          }
          break;
        default:
          return;
      }

      setValue((vls) => {
        return {
          ...vls,
          [c]: tm,
        };
      });
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!activeTeamTask) return;

    const hours = +value["hours"];
    const minutes = +value["minutes"];
    if (isNaN(hours) || isNaN(minutes) || (hours === 0 && minutes === 0)) {
      return;
    }

    const { h: estimateHours, m: estimateMinutes } = secondsToTime(
      activeTeamTask.estimate || 0
    );

    if (hours === estimateHours && minutes === estimateMinutes) {
      return;
    }

    updateTask({
      ...activeTeamTask,
      estimateHours: hours,
      estimateMinutes: minutes,
      estimate: hours * 60 * 60 + minutes * 60, // time seconds
    });
  }, [activeTeamTask, updateTask, value]);

  return (
    <>
      <span className="text-[16px] flex text-[#9490A0] dark:text-[#616164] font-base items-end">
        Estimate (H/m):{" "}
      </span>
      <TimeInput
        type="text"
        value={value["hours"]}
        handleChange={onChange("hours")}
        handleEnter={handleSubmit}
        placeholder="Hours"
        name="hours"
        style="mx-5 w-[30px] bg-transparent"
        disabled={activeTeamTask ? false : true}
      />{" "}
      <span className="w-3 h-3">
        {updateLoading ? <Spinner dark={false} /> : "/"}
      </span>{" "}
      <TimeInput
        type="text"
        value={value["minutes"]}
        handleChange={onChange("minutes")}
        placeholder="Minutes"
        name="minutes"
        style="mx-5 w-[30px] bg-transparent"
        handleEnter={handleSubmit}
        disabled={activeTeamTask ? false : true}
      />
    </>
  );
}
