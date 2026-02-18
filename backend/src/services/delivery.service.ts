
export class DeliveryService {
  private readonly SAME_CITY_FEE = 500; // 5.00 GHS in pesewas
  private readonly DIFFERENT_CITY_FEE = 1000; // 10.00 GHS in pesewas
  private readonly OUTSIDE_REGION_FEE = 2500; // 25.00 GHS in pesewas (Example)

  /**
   * Calculate delivery fee between seller and buyer
   * distinct logic for "Bono" region
   */
  calculateFee(
    sellerRegion: string,
    sellerCity: string | null | undefined, // Seller might not have city structured
    buyerRegion: string,
    buyerCity: string
  ): number {
    // Normalize
    const sRegion = sellerRegion?.toLowerCase().trim();
    const bRegion = buyerRegion?.toLowerCase().trim();
    const sCity = sellerCity?.toLowerCase().trim();
    const bCity = buyerCity?.toLowerCase().trim();

    // If both in Bono Region
    if (sRegion?.includes('bono') && bRegion?.includes('bono')) {
      // If same city (requires sellerCity to be known)
      if (sCity && bCity && sCity === bCity) {
        return this.SAME_CITY_FEE;
      }
      return this.DIFFERENT_CITY_FEE;
    }

    // Default for now
    return this.DIFFERENT_CITY_FEE; 
  }
}

export const deliveryService = new DeliveryService();
