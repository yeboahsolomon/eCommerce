/**
 * Delivery Fee Calculator for Ghana Market
 *
 * Inspired by Jumia Ghana's zonal logistics model. Fees are calculated
 * based on the geographic distance between the seller's region and the
 * buyer's delivery address, with optional weight-based surcharges.
 *
 * Zone tiers:
 *   Zone 1 – Same city as seller       → ₵8   base
 *   Zone 2 – Same region, diff city    → ₵15  base
 *   Zone 3 – Adjacent / nearby region  → ₵25  base
 *   Zone 4 – Moderate distance         → ₵38  base
 *   Zone 5 – Long distance / remote    → ₵55  base
 *
 * Weight surcharges (above 2 kg free threshold):
 *   Zones 1–2: ₵0/kg    (free — local delivery)
 *   Zone 3:    ₵2/kg
 *   Zone 4:    ₵3/kg
 *   Zone 5:    ₵5/kg
 *
 * All internal values are stored in pesewas (1 GHS = 100 pesewas)
 * to avoid floating-point issues.
 */

import {
  normalizeRegion,
  getRegionZone,
  ZONE_LABELS,
  ZONE_DELIVERY_DAYS,
} from '../constants/ghana-regions.js';

// ━━━━━━━━━━━━━━━━━━━━━━ Fee Configuration ━━━━━━━━━━━━━━━━━━━━━━

/** Base fees per zone in pesewas */
const ZONE_BASE_FEES: Record<number, number> = {
  1:  800,  // ₵8.00  — Same city
  2: 1500,  // ₵15.00 — Same region
  3: 2500,  // ₵25.00 — Adjacent region
  4: 3800,  // ₵38.00 — Moderate distance
  5: 5500,  // ₵55.00 — Long distance
};

/** Weight surcharge per kg above the free threshold, in pesewas */
const ZONE_WEIGHT_SURCHARGES: Record<number, number> = {
  1:   0,   // Free for local
  2:   0,   // Free for same-region
  3: 200,   // ₵2.00/kg
  4: 300,   // ₵3.00/kg
  5: 500,   // ₵5.00/kg
};

/** Weight in grams below which no weight surcharge applies */
const FREE_WEIGHT_THRESHOLD_GRAMS = 2000; // 2 kg

/** Default assumed weight when product has no weight data */
const DEFAULT_ITEM_WEIGHT_GRAMS = 500; // 0.5 kg

// ━━━━━━━━━━━━━━━━━━━━━━ Types ━━━━━━━━━━━━━━━━━━━━━━

export type DeliveryZone = 1 | 2 | 3 | 4 | 5;

export interface DeliveryFeeInput {
  sellerRegion: string | null | undefined;
  sellerCity: string | null | undefined;
  buyerRegion: string | null | undefined;
  buyerCity: string | null | undefined;
}

export interface EnhancedDeliveryFeeInput extends DeliveryFeeInput {
  /** Total weight of seller's package in grams. Null/0 → uses default. */
  totalWeightInGrams?: number | null;
}

export interface DeliveryFeeResult {
  feeInPesewas: number;
  feeInCedis: number;
  zone: DeliveryZone;
  zoneName: string;
  estimatedDays: string;
  breakdown: {
    baseFeeInPesewas: number;
    weightSurchargeInPesewas: number;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━

/**
 * Normalises a location string for reliable comparison.
 * Trims whitespace, lowercases, and collapses multiple spaces.
 */
function normaliseLocation(value: string | null | undefined): string {
  if (!value) return '';
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ━━━━━━━━━━━━━━━━━━━━━━ Service ━━━━━━━━━━━━━━━━━━━━━━

export class DeliveryService {

  /**
   * Backward-compatible method: returns just the fee in pesewas.
   * Used by existing code that doesn't need zone metadata.
   */
  calculateFee(
    sellerRegion: string | null | undefined,
    sellerCity: string | null | undefined,
    buyerRegion: string | null | undefined,
    buyerCity: string | null | undefined,
  ): number {
    return this.calculate({ sellerRegion, sellerCity, buyerRegion, buyerCity }).feeInPesewas;
  }

  /**
   * Full calculation returning fee, zone info, and breakdown.
   * This version does NOT account for weight (kept for backward compatibility).
   */
  calculate(input: DeliveryFeeInput): DeliveryFeeResult {
    return this.calculateEnhanced({ ...input, totalWeightInGrams: null });
  }

  /**
   * Enhanced calculation that accounts for both distance (zone) and weight.
   * This is the primary method for new code paths.
   */
  calculateEnhanced(input: EnhancedDeliveryFeeInput): DeliveryFeeResult {
    const sRegionNorm = normalizeRegion(input.sellerRegion);
    const bRegionNorm = normalizeRegion(input.buyerRegion);
    const sCity = normaliseLocation(input.sellerCity);
    const bCity = normaliseLocation(input.buyerCity);

    // Determine zone
    const zone = this.resolveZone(sRegionNorm, bRegionNorm, sCity, bCity);

    // Base fee
    const baseFee = ZONE_BASE_FEES[zone] ?? ZONE_BASE_FEES[5];

    // Weight surcharge
    const weightGrams = input.totalWeightInGrams ?? 0;
    let weightSurcharge = 0;

    if (weightGrams > FREE_WEIGHT_THRESHOLD_GRAMS) {
      const chargeableKg = Math.ceil((weightGrams - FREE_WEIGHT_THRESHOLD_GRAMS) / 1000);
      const ratePerKg = ZONE_WEIGHT_SURCHARGES[zone] ?? ZONE_WEIGHT_SURCHARGES[5];
      weightSurcharge = chargeableKg * ratePerKg;
    }

    const totalFee = baseFee + weightSurcharge;

    return {
      feeInPesewas: totalFee,
      feeInCedis: totalFee / 100,
      zone: zone as DeliveryZone,
      zoneName: ZONE_LABELS[zone] || 'Unknown',
      estimatedDays: ZONE_DELIVERY_DAYS[zone] || '7–10 business days',
      breakdown: {
        baseFeeInPesewas: baseFee,
        weightSurchargeInPesewas: weightSurcharge,
      },
    };
  }

  /**
   * Resolve the delivery zone based on seller and buyer locations.
   *
   *  1. If either region is unknown → zone 5 (safest default)
   *  2. If same region → zone 1 (same city) or zone 2 (different city)
   *  3. If different regions → look up the zone matrix (zones 3–5)
   */
  private resolveZone(
    sellerRegion: string,
    buyerRegion: string,
    sellerCity: string,
    buyerCity: string,
  ): number {
    // Unknown locations → highest zone per Jumia pattern
    if (!sellerRegion || !buyerRegion) return 5;

    // Same-region check (compare normalised canonical names)
    const sLower = sellerRegion.toLowerCase();
    const bLower = buyerRegion.toLowerCase();

    if (sLower === bLower) {
      // Same city within the region → cheapest tier
      if (sellerCity && buyerCity && sellerCity === buyerCity) {
        return 1;
      }
      // Same region, different (or unknown) city
      return 2;
    }

    // Cross-region → use zone matrix
    return getRegionZone(sellerRegion, buyerRegion);
  }
}

export const deliveryService = new DeliveryService();
