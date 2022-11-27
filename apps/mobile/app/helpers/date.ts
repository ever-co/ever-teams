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