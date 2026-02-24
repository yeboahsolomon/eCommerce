
export class DeliveryService {
  private readonly SAME_CITY_FEE = 1000; // 10.00 GHS in pesewas
  private readonly SAME_REGION_FEE = 1500; // 15.00 GHS in pesewas
  private readonly DIFFERENT_REGION_FEE = 3000; // 30.00 GHS in pesewas

  /**
   * Calculate delivery fee between seller and buyer
   * based on Ghana regions and cities.
   */
  calculateFee(
    sellerRegion: string | null | undefined,
    sellerCity: string | null | undefined,
    buyerRegion: string | null | undefined,
    buyerCity: string | null | undefined
  ): number {
    // Normalize text for comparison
    const sRegion = sellerRegion?.toLowerCase().trim() || '';
    const bRegion = buyerRegion?.toLowerCase().trim() || '';
    const sCity = sellerCity?.toLowerCase().trim() || '';
    const bCity = buyerCity?.toLowerCase().trim() || '';

    // If we don't know where it's going or coming from, assume long distance
    if (!sRegion || !bRegion) {
      return this.DIFFERENT_REGION_FEE;
    }

    // If in the exact same city
    if (sRegion === bRegion && sCity && bCity && sCity === bCity) {
      return this.SAME_CITY_FEE;
    }

    // If in the same region but different (or unknown) cities
    if (sRegion === bRegion) {
      return this.SAME_REGION_FEE;
    }

    // Different regions
    return this.DIFFERENT_REGION_FEE;
  }
}

export const deliveryService = new DeliveryService();
