# Clean: home services marketplace

A complete website for booking home services, in the style of Urban Company. It has four parts:

- **Customer site.** Customers browse 9 categories and 43 services with fixed prices, use a cart with coupons, pick an address and a time slot, and pay online or after the service. They can track a booking, reschedule or cancel it, and rate it.
- **Login.** Login is by mobile number and a 6-digit SMS code. There are no passwords.
- **Partner portal.** Professionals apply online. Once approved, they see open jobs in their city that match their skills and accept them. They then mark themselves on the way, start the job with the customer's 4-digit start code, and complete it. The portal also shows their earnings.
- **Admin panel.** Admins get an overview of the numbers, can search bookings and assign or change them, and handle refunds. They also review professionals and edit services, prices, categories, coupons and cities.

Built with Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Prisma 6 and SQLite. Postgres is optional.

## Run it on your computer

You need Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env        # then edit .env
npm run db:setup            # creates the database and loads the catalogue
npm run dev                 # http://localhost:3000
```

To log in, enter any 10-digit mobile number starting with 6 to 9. In development the code appears on the login screen and in the terminal. The number in `ADMIN_PHONES` (`9000000000` by default) is an admin. The admin panel has its own login at `/admin/login`, separate from the website login, so you can be signed in to the admin panel and, in the same browser, to the website as a customer or professional.

Useful commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` then `npm start` | Production build and server |
| `npm run db:seed` | Re-load the catalogue. Safe to run again; it updates and never duplicates |
| `npm run db:studio` | Browse the database in the browser |
| `npm run typecheck`, `npm run lint` | Checks |

## Settings

Business rules live in `src/config/site.ts`:

- brand name
- support email and phone
- legal name and office address
- visiting fee (Rs 49 under Rs 999)
- professional share (80%)
- slot hours (8 AM to 7 PM)
- booking lead time (2 hours)
- free change window (2 hours)
- warranty days (30)

Change them there and rebuild.

### Prices

You can edit all 94 price options in Excel or Google Sheets:

```bash
npm run prices:export      # writes prisma/prices.csv
# open prisma/prices.csv, change Price / Original price / Minutes, save as CSV
npm run prices:import      # loads the new prices, then restart the app
```

- Leave "Original price" empty to hide the crossed-out price.
- Don't change the "Option" or "Service key" columns; they are how rows are matched.
- `npm run db:setup` also loads `prisma/prices.csv` if it exists. Commit the file and a new server starts with your prices.
- Single prices can also be changed in the admin panel under Services and prices.
- The minimum order (Rs 299) and the visiting fee are set in `src/config/site.ts`.

Secrets and keys go in `.env`, which is never committed:

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | Database location |
| `APP_URL` | Your public address, for example `https://yourdomain.in` |
| `ADMIN_PHONES` | Admin mobile numbers, comma separated |
| `SMS_PROVIDER`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | Real login SMS. **Required in production**: with `console`, codes only go to the server log and customers cannot log in |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online payment. Leave empty to offer only "Pay after service" |
| `RAZORPAY_WEBHOOK_SECRET` | Confirms payments even if the customer closes the tab |

### SMS (MSG91)

Create an OTP template in MSG91 and get it approved on DLT. The template must use the variable `##OTP##`. Then set:

```
SMS_PROVIDER="msg91"
MSG91_AUTH_KEY="..."
MSG91_TEMPLATE_ID="..."
```

### Payments (Razorpay)

1. Add your key ID and secret to `.env`. A "Pay online now" option then appears at checkout.
2. In the Razorpay dashboard, add a webhook pointing to `https://yourdomain.in/api/payments/razorpay/webhook`.
3. Select the events `payment.captured` and `order.paid`.
4. Put the webhook secret in `RAZORPAY_WEBHOOK_SECRET`.

Unpaid online bookings release their slot after 30 minutes.

Refunds are made from the Razorpay dashboard. In the admin panel, open the booking and click "Mark refund sent".

### WhatsApp

Booking updates always appear under the bell icon on the site. To also send them on WhatsApp, use the WhatsApp Cloud API from Meta:

1. Create a utility template with one body variable, for example `Update from Clean: {{1}}`, and get it approved.
2. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_TEMPLATE` in `.env`.

To show the green "Chat with us" button, put your WhatsApp number in `whatsappNumber` in `src/config/site.ts`.

## Deploy on a VPS (Ubuntu)

```bash
# on the server, as a normal user with sudo
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2

git clone <your-repo-url> clean && cd clean
cp .env.example .env && nano .env      # set APP_URL, ADMIN_PHONES, SMS and Razorpay keys
npm ci
npm run db:setup                       # must run BEFORE the build: pages are prerendered from the database
npm run build
pm2 start npm --name clean -- start    # serves on port 3000
pm2 save && pm2 startup
```

Then set up nginx as a reverse proxy in `/etc/nginx/sites-available/clean`:

```nginx
server {
    server_name yourdomain.in www.yourdomain.in;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    client_max_body_size 12m;   # professionals upload ID photos when they apply
}
```

```bash
sudo ln -s /etc/nginx/sites-available/clean /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d yourdomain.in -d www.yourdomain.in
```

To update the site later:

```bash
git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 restart clean
```

Back up the database regularly. With SQLite that means copying `prisma/dev.db`; rename it in `DATABASE_URL` if you like. Also back up `storage/uploads`, which holds the professionals' ID proofs and the "Our work" photos (in `storage/uploads/work`), or set `UPLOAD_DIR` to a folder that is backed up.

## Moving to Postgres

SQLite is fine for one server and a few thousand bookings a month. To move to Postgres:

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL="postgresql://user:password@host:5432/clean"`.
3. Delete the `prisma/migrations` folder.
4. Run `npx prisma migrate dev --name init`.
5. Run `npm run db:seed`.

## Photos

Photos come from Wikimedia Commons under CC0, public-domain, CC BY and CC BY-SA licences. The credits page lists them, and the list lives in `src/config/photo-credits.json`.

- Category photos are in `public/img/cat/`.
- Service photos are in `public/img/svc/<service-slug>.jpg`. The seed picks a service photo up automatically if the file exists.

For launch, replace them with photos of your own team and work. Then update or empty the credits file.

When you replace a photo, give the new file a new name. The site caches resized photos by their address for hours, so a new photo saved under an old name keeps showing the old picture.

## Catering menus (per plate)

Catering is priced per plate: the customer picks a package, enters the number of guests and chooses dishes for each course. The price is the plate price plus any extras, times the guests.

- **Packages** are price options with **Priced: Per plate**, with a minimum and maximum number of guests (admin, Services and prices, the service).
- **Courses and dishes** are edited under **Menu and dishes** on that service. A dish can be veg or non-veg and can cost extra per plate (for example mutton). "Always served" courses (salad, papad...) need no choice.
- **Rules per package**: for each course, how many dishes are included in the price, the fewest and most the customer may pick, and the extra per plate for each dish beyond the included ones. Leave a course blank to leave it out of a package.
- The chosen menu is checked again by the server in the cart, the price and the booking, and saved with the booking. It shows on the booking, in admin, on the professional's job and on the invoice.
- `npm run db:seed` gives the Catering service a starting menu (3 packages, Hyderabadi, South and North Indian dishes) once, if it has none.
- **Dish photos** are files in `public/img/dishes/`, named after the dish: lowercase, with anything that is not a letter or digit turned into "-" (for "Buttermilk (majjiga)" the file is `buttermilk-majjiga.jpg`). A dish without a photo shows a plate icon. Use a 4:3 JPEG, at least 1000x750. Renaming a dish in admin needs the file renamed too.
- **To replace a dish photo**, save the new one as `<name>.v2.jpg` (then `.v3.jpg` and so on) next to the old one. The highest version is shown, and the new name gets past the photo cache. In development it shows at once; on the live server, run the build again (`npm run build` and `pm2 restart clean`), because the live site only serves photos that were there at build time.

## Our work gallery

Photos of real jobs and events, added in the admin panel under **Our work**. Each has a title, an optional category, service, city and date, and an optional before photo (then a before and after slider is shown). "Show on the home page" picks the photos for the home page section.

- The gallery appears at `/our-work`, on the home page, on each category page and in the app. The links stay hidden until at least one photo is published.
- Uploads are JPG, PNG or WEBP, up to 8 MB. Each photo is turned the right way up, shrunk to at most 2000 px and saved without metadata, so a phone's GPS location is never published.
- Use only your own photos, and ask customers before showing their home or event.

## Wording

These are all in `src/strings.ts`, so change the wording there:
- the text on the customer and professional pages;
- error messages;
- notifications.

Service names, descriptions and prices are set in the admin panel.

## Android apps

There are two apps, both in `D:\clean-app`:

- **`twa`: the website as a Play Store app.** Small, and every website update reaches it at once. See `D:\clean-app\twa\README.md`.
- **`mobile`: a native app** (React Native with Expo) for customers and professionals. See `D:\clean-app\mobile\README.md`.

The native app uses the website's app API under `/api/v1`. It signs in with a phone code and a bearer token instead of the website's cookie. The rules are shared with the website (booking, cancelling, partner jobs), so both always behave the same.

| Endpoint | Purpose |
|---|---|
| `POST /auth/code`, `POST /auth/verify`, `POST /auth/logout` | Log in with a phone code; the answer includes a token |
| `GET /settings`, `GET /catalog`, `GET /services/[slug]` | Business settings, cities, categories and services |
| `GET /portfolio`, `GET /portfolio/[id]` | "Our work" photos (`?category=<slug>`, `?limit=<n>`), and one photo with more like it |
| `POST /quote`, `GET /slots?cityId=` | Price a cart; list open time slots |
| `GET`/`PATCH /me`, `GET`/`POST /addresses`, `DELETE /addresses/[id]` | Account and saved addresses |
| `GET`/`POST /bookings`, `GET /bookings/[code]` | List, place and view bookings |
| `POST /bookings/[code]/cancel`, `/reschedule`, `/rate`, `/payment` | Change a booking |
| `GET`/`POST /notifications` | Read notifications; mark them all read |
| `GET /partner`, `POST /partner/apply`, `POST /partner/jobs/[code]/accept`, `/on-the-way`, `/start`, `/complete` | Professionals |

## Before you launch

- Set the real brand name, support email, phone, legal name and address in `src/config/site.ts`.
- Have a lawyer review the terms, privacy and refund pages.
- Confirm you will honour the promises shown on the site: verified professionals, the 30-day warranty, a free redo within 7 days, and free changes up to 2 hours before the visit.
- Set up MSG91 and Razorpay, as above.
- Set up WhatsApp, as above, so customers and professionals get booking updates on their phones.
