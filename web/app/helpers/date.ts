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
