export function changeTimezone(date: Date, ianatz?: string) {
  const invdate = new Date(
    date.toLocaleString("en-US", {
      timeZone: ianatz,
    })
  );

  const diff = date.getTime() - invdate.getTime();

  return new Date(date.getTime() - diff);
}

export function userTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function addHours(numOfHours: number, date = new Date()) {
  date.setTime(date.getTime() + numOfHours * 60 * 60 * 1000);

  return date;
}

export function secondsToTime(secs: number) {
  const hours = Math.floor(secs / (60 * 60));

  const divisor_for_minutes = secs % (60 * 60);
  const minutes = Math.floor(divisor_for_minutes / 60);

  const divisor_for_seconds = divisor_for_minutes % 60;
  const seconds = Math.ceil(divisor_for_seconds);

  return {
    h: hours,
    m: minutes,
    s: seconds,
  };
}

export function tiersToTime(sec: number) {
  const secs = sec / 60;
  const hours = Math.floor(secs / (60 * 60));

  const divisor_for_minutes = secs % (60 * 60);
  const minutes = Math.floor(divisor_for_minutes / 60);

  const divisor_for_seconds = divisor_for_minutes % 60;
  const seconds = Math.ceil(divisor_for_seconds);

  return {
    h: hours,
    m: minutes,
    s: seconds,
    t: seconds / 60,
  };
}
