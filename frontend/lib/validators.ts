import { z } from "zod";

export const checkoutSchema = z.object({
  fullName: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^0(23|24|25|54|55|59|27|57|26|56|20|50)\d{7}$/, "Invalid Ghana phone number (e.g., 0244123456)"),
  region: z.string().min(1, "Please select a region"),
  city: z.string().min(2, "City is required"),
  address: z.string().min(5, "Street name/Landmark is required"),
  gpsAddress: z.string().regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/, "Invalid GPS format (e.g., GA-183-8164)").optional().or(z.literal("")),
  paymentMethod: z.enum(["MOMO", "CARD", "CASH"]),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
