// src/pages/order/formatDiscountInfo.ts
import { formatCurrencyWithSeparator } from "@/lib/currencyFormat"; // <-- Update path as necessary


export const formatDiscountInfo = (
  discountType: 'percentage' | 'fixed' | string,
  discountRate: number
): string => {
  if (discountType === 'percentage') {
    return `(${(discountRate * 100).toFixed(0)}%)`;
  } else if (discountType === 'fixed') {
    return `(${formatCurrencyWithSeparator(discountRate)})`; // <-- updated line
  }
  return '';
};
