import * as React from "react";

const buildDateKey = (value: Date) => {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const getRangeForPreset = (preset: string) => {
  const now = new Date();
  const todayKey = buildDateKey(now);

  if (preset === "today") {
    return { start: todayKey, end: todayKey };
  }

  if (preset === "last7") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { start: buildDateKey(start), end: todayKey };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: buildDateKey(start), end: buildDateKey(end) };
  }

  return { start: "", end: "" };
};

export const normalizeStatus = (value: unknown) =>
  String(value ?? "")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[‎‏‪-‮]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

export function useCustomerFilters(
  customers: any[],
  search: string,
  dateFilter: string,
  createdPreset: string,
  createdFrom: string,
  createdTo: string
) {
  return React.useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    const presetRange = getRangeForPreset(createdPreset);
    const fromKey = createdPreset === "custom" ? (createdFrom || "") : presetRange.start;
    const toKey = createdPreset === "custom" ? (createdTo || "") : presetRange.end;
    const rangeStart = fromKey && toKey ? (fromKey <= toKey ? fromKey : toKey) : fromKey || toKey;
    const rangeEnd = fromKey && toKey ? (fromKey <= toKey ? toKey : fromKey) : fromKey || toKey;

    return customers.filter((customer: any) => {
      const matchesSearch =
        customer.name?.toLowerCase().includes(normalizedSearch) ||
        customer.phone?.some((phone: any) => String(phone ?? "").toLowerCase().includes(normalizedSearch));

      const selectedStatus = normalizeStatus(dateFilter);
      const currentStatus = normalizeStatus(customer?.status);
      const matchesStatus = selectedStatus !== normalizeStatus("الكل")
        ? currentStatus === selectedStatus
        : true;

      const customerCreatedAt = customer?.createdAt ? new Date(customer.createdAt) : null;
      const hasValidCreatedAt = Boolean(customerCreatedAt && !Number.isNaN(customerCreatedAt.getTime()));
      const customerCreatedKey = hasValidCreatedAt
        ? `${customerCreatedAt!.getFullYear()}-${String(customerCreatedAt!.getMonth() + 1).padStart(2, "0")}-${String(customerCreatedAt!.getDate()).padStart(2, "0")}`
        : "";
      const matchesCreatedAt =
        (!rangeStart || customerCreatedKey >= rangeStart) &&
        (!rangeEnd || customerCreatedKey <= rangeEnd);

      return matchesSearch && matchesStatus && matchesCreatedAt;
    });
  }, [customers, search, dateFilter, createdPreset, createdFrom, createdTo]);
}
