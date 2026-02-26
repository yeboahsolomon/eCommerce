/**
 * Delivery Fee Calculator for Ghana Market
 *
 * Pricing tiers (in GHS):
 *   - Same city/town as seller  → ₵10
 *   - Same region, different city → ₵15
 *   - Cross-region               → ₵40
 *
 * All internal values are stored in pesewas (1 GHS = 100 pesewas)
 * to avoid floating-point issues.
 */

/** Fee tiers in pesewas */
const DELIVERY_FEES = {
  SAME_CITY: 1000,          // ₵10.00
  SAME_REGION: 1500,        // ₵15.00
  CROSS_REGION: 4000,       // ₵40.00
  UNKNOWN_LOCATION: 4000,   // Default to cross-region when location data is missing
} as const;

/**
 * Normalises a location string for reliable comparison.
 * Trims whitespace, lowercases, and collapses multiple spaces.
 */
function normaliseLocation(value: string | null | undefined): string {
  if (!value) return '';
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

export interface DeliveryFeeInput {
  sellerRegion: string | null | undefined;
  sellerCity: string | null | undefined;
  buyerRegion: string | null | undefined;
  buyerCity: string | null | undefined;
}

export interface DeliveryFeeResult {
  feeInPesewas: number;
  feeInCedis: number;
  tier: 'SAME_CITY' | 'SAME_REGION' | 'CROSS_REGION' | 'UNKNOWN';
}

export class DeliveryService {

  /**
   * Calculate the delivery fee between a seller's location and the buyer's
   * delivery address.
   *
   * @returns fee in **pesewas**
   */
  calculateFee(
    sellerRegion: string | null | undefined,
    sellerCity: string | null | undefined,
    buyerRegion: string | null | undefined,
    buyerCity: string | null | undefined
  ): number {
    return this.calculate({ sellerRegion, sellerCity, buyerRegion, buyerCity }).feeInPesewas;
  }

  /**
   * Full calculation returning fee, cedis value, and the pricing tier
   * that was applied.
   */
  calculate(input: DeliveryFeeInput): DeliveryFeeResult {
    const sRegion = normaliseLocation(input.sellerRegion);
    const bRegion = normaliseLocation(input.buyerRegion);
    const sCity   = normaliseLocation(input.sellerCity);
    const bCity   = normaliseLocation(input.buyerCity);

    // If we don't have enough data, fall back to the highest tier
    if (!sRegion || !bRegion) {
      return {
        feeInPesewas: DELIVERY_FEES.UNKNOWN_LOCATION,
        feeInCedis: DELIVERY_FEES.UNKNOWN_LOCATION / 100,
        tier: 'UNKNOWN',
      };
    }

    // Same region check
    if (sRegion === bRegion) {
      // Same city within the region → cheapest tier
      if (sCity && bCity && sCity === bCity) {
        return {
          feeInPesewas: DELIVERY_FEES.SAME_CITY,
          feeInCedis: DELIVERY_FEES.SAME_CITY / 100,
          tier: 'SAME_CITY',
        };
      }

      // Same region, different (or unknown) city
      return {
        feeInPesewas: DELIVERY_FEES.SAME_REGION,
        feeInCedis: DELIVERY_FEES.SAME_REGION / 100,
        tier: 'SAME_REGION',
      };
    }

    // Different regions
    return {
      feeInPesewas: DELIVERY_FEES.CROSS_REGION,
      feeInCedis: DELIVERY_FEES.CROSS_REGION / 100,
      tier: 'CROSS_REGION',
    };
  }
}

export const deliveryService = new DeliveryService();
