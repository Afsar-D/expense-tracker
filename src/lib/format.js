export function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

export function formatCategory(value) {
  if (!value) {
    return "";
  }

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function parseMembers(raw) {
  if (!raw) {
    return [];
  }

  const members = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(members)];
}
