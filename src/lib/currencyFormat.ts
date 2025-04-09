// Updated formatCurrency to support thousands separator and locale-specific formatting
export function formatCurrencyWithSeparator(amount: number): string {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }