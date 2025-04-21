//src\pages\searchPage\search\discountUtils.ts
export function calculateDiscountPercentage(price: number, discountPrice: number): number {
    if (price <= 0 || discountPrice >= price) return 0;
    return Math.round(((price - discountPrice) / price) * 100);
  }
  