export function getWeekRange(date: Date) {
  const start = new Date(date);
  const day = start.getDay(); // 0=Sun, 1=Mon, ...
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const weekStart = new Date(start.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}