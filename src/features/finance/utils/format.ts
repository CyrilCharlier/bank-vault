import type { AccountType } from "../../../types";

const userLocales =
  navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

export function formatCurrency(amount: number, currencyCode = "EUR") {
  return new Intl.NumberFormat(userLocales, {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}

export function formatDate(value: string) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(userLocales).format(
      new Date(year, month - 1, day)
    );
  }

  return new Intl.DateTimeFormat(userLocales, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAccountType(type: AccountType) {
  switch (type) {
    case "checking":
      return "Compte courant";
    case "savings":
      return "Épargne";
    case "cash":
      return "Espèces";
    case "credit":
      return "Crédit";
    default:
      return type;
  }
}

export function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value);
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}