const dateOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

const shortDateOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

export function formatDate(dateStr: string | null, short = false): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", short ? shortDateOptions : dateOptions);
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}
