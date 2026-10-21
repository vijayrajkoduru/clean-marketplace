import { z } from "zod";
import { site } from "@/config/site";

/** A cart sent by the mobile app. The app keeps the cart on the phone. */
export const cartSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(10),
        // Catering: the number of guests and the chosen dish ids (checked against the menu on the server).
        guests: z.number().int().min(1).max(5000).optional(),
        menu: z.array(z.string().min(1)).max(60).optional(),
      }),
    )
    .max(site.maxCartItems),
  couponCode: z.string().trim().toUpperCase().nullish(),
  buyPlus: z.boolean().optional(),
  useCredit: z.boolean().optional(),
});
