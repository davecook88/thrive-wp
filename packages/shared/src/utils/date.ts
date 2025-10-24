export const prettyDate = (date?: Date | string): string => {
  if (!date) return "";
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
