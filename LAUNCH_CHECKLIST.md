# Launch checklist

Everything still to do before the website and the apps go live, as of 22 October 2026. Tick items here on GitHub as they are done.

The website, the Android app and the iPhone/iPad app are built and tested. What is left is mostly business setup, details only you can give, and photos.

## 1. Details needed from you

- [ ] **Brand name, logo and domain.** "Clean" is a placeholder. The name goes in `src/config/site.ts`; the logo replaces the icons.
- [ ] **SMS login (MSG91).** Auth key and an approved OTP template. Without them, customers cannot get their login code.
- [ ] **Online payment (Razorpay).** Live key ID, key secret and webhook secret. Until then, only "Pay after service" is offered.
- [ ] **Business details.** GSTIN, legal name, office address, support phone and support email (in `src/config/site.ts`).
- [ ] **Real prices.** The catering package prices especially are placeholders. All prices can be edited in Excel (`npm run prices:export` / `prices:import`) or in the admin panel.
- [ ] **Admin phone numbers.** Only these numbers can open the admin panel (`ADMIN_PHONES` in `.env`).
- [ ] **WhatsApp (optional).** The business number for the green chat button, and Meta WhatsApp Cloud API details for booking updates.

## 2. Costs (approximate; check current prices before paying)

| Item | Approx. cost |
|---|---|
| Domain (`.in` or `.com`) | Rs 500 to 1,200 a year |
| DLT registration for SMS (needed for MSG91 in India) | about Rs 5,900 once |
| Google Play developer account (Android app) | $25 once, about Rs 2,100 |
| Apple Developer account (iPhone and iPad app) | $99 a year, about Rs 8,700 |
| Server (VPS) | Rs 0 on your existing Hostinger VPS; a new one is about Rs 600 to 900 a month |
| SSL certificate (https) | Free |
| SMS login codes | about Rs 0.20 to 0.30 per code |
| Razorpay online payments | no monthly fee, about 2% of each online payment |
| WhatsApp booking updates (optional) | about Rs 0.12 to 0.15 per message |
| Lawyer check of terms and privacy (advised) | Rs 5,000 to 25,000 |
| FSSAI food licence (for catering) | about Rs 100 a year (basic registration) or Rs 2,000 to 5,000 a year (state licence) |

To start with the website and the Android app: about Rs 9,000 (domain, DLT, Play Store), plus a few hundred rupees a month for SMS. The iPhone/iPad app adds about Rs 8,700 a year.

## 3. Registrations (confirm with your CA)

- [ ] **FSSAI food licence**, needed to sell catering.
- [ ] **GST registration.** Required once service turnover passes Rs 20 lakh a year, or earlier to issue GST invoices from day one.
- [ ] **Shop and Establishment registration** for the office (state rules).
- [ ] **Business bank account and Razorpay KYC** (PAN, bank details, business proof, and the live website with its policy pages).
- [ ] **DLT registration and an approved OTP template** for SMS.

## 4. Professionals

- [ ] Recruit professionals and verify each one: ID, references and, ideally, police verification. The site promises "verified professionals".
- [ ] A written agreement with each professional: the 80% share, payout timing, conduct, damage and no-shows.
- [ ] Consider insurance for damage or injury during jobs.
- [ ] Train them on the partner portal or the app: accept a job, "on my way", start with the customer's code, complete.

## 5. Running the business

- [ ] Be ready to keep the site's promises: the 30-day warranty, a free redo within 7 days, and free changes up to 2 hours before the visit.
- [ ] Someone to answer the support phone and WhatsApp, and a fixed routine for refunds and complaints.
- [ ] Do a few real bookings end to end before launch, including a real online payment and a refund.
- [ ] Train whoever runs the admin panel: bookings, assigning professionals, refunds, approving professionals, prices, the "Our work" gallery.
- [ ] Have a lawyer read the terms, privacy and refund pages.

## 6. Photos and content

- [ ] **Dish photos: 23 of 76 done** (welcome drinks, veg starters, veg curries). Still to do: non-veg starters, non-veg curries, biryani, rice, dal, fry, breads, sweets and the always-served items. "Chicken fry piece biryani" has no photo yet.
- [ ] **Service photos.** These are free stock photos for now; photos of your own team at work are better.
- [ ] **"Our work" gallery.** It stays hidden until real job photos are added in the admin panel.

## 7. Getting customers

- [ ] Google Business Profile, so you show up on Google Maps and local searches.
- [ ] Play Store listing: screenshots, description, privacy policy link (`/privacy` on the website) and the data safety form.
- [ ] App Store listing: the same, plus iPad screenshots and a test login for Apple's reviewer.
- [ ] Social media pages.

## 8. Technical work left

- [ ] **Go live.** Put the website on the VPS with the domain and https (steps in `README.md`), then build the Android app with the live https address.
- [ ] **Daily database backup** on the VPS.
- [ ] **Test login for Apple's reviewer.** A fixed number and code for App Store review, because the reviewer cannot receive SMS codes.
- [ ] **iPhone and iPad app.** After the Apple Developer account: build with EAS, test through TestFlight, submit for review. Until the App Store's Expo Go reaches SDK 58, iPad testing uses the SDK 57 copy in `D:\clean-app-ios-test`.
- [ ] **Remaining dish photos**, as they arrive (section 6).

## 9. Optional features

- [ ] Email booking confirmations and invoices (today: WhatsApp and the site's notification bell).
- [ ] Catering event details: event date and time, venue, and a printable quotation PDF.
- [ ] Google Analytics and Search Console.
- [ ] Automatic payouts to professionals by UPI or bank (RazorpayX); today they are marked as paid by hand.
