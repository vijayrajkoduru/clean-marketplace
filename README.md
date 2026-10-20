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

To log in, enter any 10-digit mobile number starting with 6 to 9. In development the code appears on the login screen and in the terminal. The number in `ADMIN_PHONES` (`9000000000` by default) becomes an admin and can open `/admin`.

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

Back up the database regularly. With SQLite that means copying `prisma/dev.db`; rename it in `DATABASE_URL` if you like.

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

## Before you launch

- Set the real brand name, support email, phone, legal name and address in `src/config/site.ts`.
- Have a lawyer review the terms, privacy and refund pages.
- Confirm you will honour the promises shown on the site: verified professionals, the 30-day warranty, a free redo within 7 days, and free changes up to 2 hours before the visit.
- Set up MSG91 and Razorpay, as above.
- Booking notifications (`src/lib/notify.ts`) currently go only to the server log. Connect an SMS or WhatsApp provider there to text customers and professionals about their bookings.
