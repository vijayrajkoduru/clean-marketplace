/**
 * Business settings in one place. Change the brand name, fees and booking
 * rules here; everything else reads from this file.
 */
export const site = {
  name: "Clean",
  wordmark: "clean",
  tagline: "Home services, done right",
  description:
    "Book trusted professionals for home cleaning, AC and appliance repair, electricians, plumbers, carpenters, pest control, salon at home and painting. Fixed prices, verified experts, 30-day warranty.",
  supportEmail: "support@example.com",
  /** For example "+91 98765 43210". Leave empty to hide it. */
  supportPhone: "" as string,
  /** Shown on the legal pages. Use the registered name of your business. */
  legalName: "Clean Home Services",
  /** Registered office, shown on the contact and legal pages. */
  officeAddress: "Hyderabad, Telangana, India",
  /** Customer support hours, India Standard Time. */
  supportHours: "8 AM to 9 PM, every day",
  /** Days the work is covered after the visit. Change only if you will honour the new number. */
  warrantyDays: 30,
  /** Smallest item total that can be booked. */
  minOrder: 299,
  /** Orders below this subtotal pay the convenience fee. */
  freeFeeAbove: 999,
  convenienceFee: 49,
  /** Share of the order subtotal paid to the professional. */
  partnerSharePercent: 80,
  /** Booking slots, all times in India Standard Time. */
  slots: {
    firstHour: 8,
    lastHour: 19,
    stepMinutes: 60,
    /** Earliest slot must be at least this far from now. */
    leadMinutes: 120,
    days: 7,
  },
  /** Customers can cancel or reschedule up to this long before the slot. */
  changeCutoffMinutes: 120,
  maxCartItems: 20,
} as const;
