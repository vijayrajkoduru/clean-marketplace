/**
 * Seeds cities, the service catalogue and starter coupons.
 * Safe to run more than once, also on a live database: only categories and services that are
 * new are added. Existing ones keep the names, prices and photos set in the admin panel;
 * a missing service photo is filled in.
 * Run with: npm run db:seed
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** A service photo at public/img/svc/<slug>.jpg, if one exists. Otherwise the category photo is used. */
function serviceImage(slug: string): string | null {
  return existsSync(join(process.cwd(), "public", "img", "svc", `${slug}.jpg`)) ? `/img/svc/${slug}.jpg` : null;
}

type V = [name: string, price: number, mrp: number | null, mins: number];
type S = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  includes: string[];
  excludes: string[];
  variants: V[];
  featured?: boolean;
  image?: string;
};
type C = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  faqs: { q: string; a: string }[];
  services: S[];
};

const cities = [
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana" },
  { slug: "vijayawada", name: "Vijayawada", state: "Andhra Pradesh" },
  { slug: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh" },
  { slug: "guntur", name: "Guntur", state: "Andhra Pradesh" },
  { slug: "nellore", name: "Nellore", state: "Andhra Pradesh" },
  { slug: "ongole", name: "Ongole", state: "Andhra Pradesh" },
];

const visitFaq = {
  q: "Are parts and materials included in the price?",
  a: "The price covers the visit, inspection and labour. If parts are needed, the professional shows you the rate card and you approve before any part is fitted.",
};
const rescheduleFaq = {
  q: "Can I reschedule or cancel?",
  a: "Yes. Reschedule or cancel free of charge from My bookings up to 2 hours before your slot.",
};

const catalog: C[] = [
  {
    slug: "cleaning",
    name: "Cleaning",
    tagline: "Deep cleaning by trained teams",
    description:
      "Full home, kitchen, bathroom, sofa and tank cleaning by trained teams who bring their own machines and safe chemicals.",
    icon: "sparkles",
    faqs: [
      {
        q: "Do I need to provide anything?",
        a: "No. The team brings machines, ladders and cleaning chemicals. We only need water and a power point.",
      },
      {
        q: "Are the cleaning chemicals safe for children and pets?",
        a: "We use biodegradable, non-toxic chemicals. Keep children and pets away from wet floors until they dry.",
      },
      rescheduleFaq,
    ],
    services: [
      {
        slug: "full-home-deep-cleaning",
        name: "Full home deep cleaning",
        summary: "Every room, kitchen and bathroom cleaned top to bottom with machines.",
        description:
          "A team of two to four professionals deep cleans your whole home: dusting, machine scrubbing of floors, kitchen degreasing, bathroom descaling, and windows, grills and fans.",
        includes: [
          "Dusting and wiping of all rooms, furniture and fixtures",
          "Machine scrubbing and mopping of all floors",
          "Kitchen degreasing: slab, tiles, sink and chimney exterior",
          "Bathroom descaling: tiles, taps, mirrors and toilet",
          "Windows, grills, doors and fan cleaning",
          "Balcony cleaning",
        ],
        excludes: [
          "Inside of wardrobes and cupboards unless empty",
          "Wall washing and paint stain removal",
          "Sofa and carpet shampoo (book separately)",
          "Moving heavy furniture",
        ],
        variants: [
          ["1 BHK", 3299, 3999, 240],
          ["2 BHK", 4499, 5499, 300],
          ["3 BHK", 5999, 7199, 360],
          ["4 BHK", 7499, 8999, 420],
        ],
        featured: true,
      },
      {
        slug: "bathroom-deep-cleaning",
        name: "Bathroom deep cleaning",
        summary: "Hard-water stains, tiles, taps and toilet descaled and disinfected.",
        description:
          "Machine scrubbing and descaling for floor and wall tiles, taps, showers, mirrors, wash basin and toilet, finished with disinfection.",
        includes: [
          "Floor and wall tile scrubbing",
          "Hard-water stain removal on taps and fittings",
          "Toilet and wash basin descaling",
          "Mirror and glass cleaning",
          "Disinfection of all surfaces",
        ],
        excludes: ["Grout re-filling or tile repair", "Removal of rust from old fittings"],
        variants: [
          ["1 bathroom", 499, 599, 60],
          ["2 bathrooms", 899, 1098, 105],
          ["3 bathrooms", 1299, 1647, 150],
        ],
        featured: true,
      },
      {
        slug: "kitchen-deep-cleaning",
        name: "Kitchen deep cleaning",
        summary: "Grease and grime removed from slab, tiles, stove, chimney and cabinets.",
        description:
          "Degreasing of the slab, wall tiles, gas stove, chimney exterior, sink and cabinet exteriors. Cabinet interiors are cleaned when empty.",
        includes: [
          "Slab and wall tile degreasing",
          "Gas stove and chimney exterior cleaning",
          "Sink and tap descaling",
          "Cabinet exteriors, and interiors when empty",
          "Floor scrubbing and mopping",
        ],
        excludes: ["Chimney filter or motor servicing", "Inside of refrigerator and oven"],
        variants: [
          ["Empty kitchen", 1299, 1599, 150],
          ["Occupied kitchen", 1599, 1899, 180],
        ],
      },
      {
        slug: "sofa-cleaning",
        name: "Sofa shampoo cleaning",
        summary: "Fabric sofas shampooed and vacuum-dried to lift dirt and stains.",
        description:
          "Dry vacuuming, foam shampooing and wet-vacuum extraction for fabric sofas, leaving them fresh and nearly dry the same day.",
        includes: ["Dry vacuuming", "Foam shampoo and stain treatment", "Wet-vacuum extraction"],
        excludes: ["Leather sofas", "Old stains that have set permanently"],
        variants: [
          ["3 seats", 599, 749, 60],
          ["5 seats", 899, 1099, 90],
          ["7 seats", 1199, 1449, 120],
        ],
        featured: true,
      },
      {
        slug: "carpet-cleaning",
        name: "Carpet shampoo cleaning",
        summary: "Carpets and rugs shampooed and extracted at home.",
        description: "Dry vacuuming followed by shampoo and wet extraction for carpets and rugs.",
        includes: ["Dry vacuuming", "Shampoo and stain treatment", "Wet extraction"],
        excludes: ["Silk and hand-knotted antique rugs"],
        variants: [
          ["Up to 25 sq ft", 399, 499, 60],
          ["Up to 50 sq ft", 699, 849, 90],
        ],
      },
      {
        slug: "mattress-cleaning",
        name: "Mattress cleaning",
        summary: "Dust mites and stains removed from both sides of the mattress.",
        description: "Vacuuming, shampoo and extraction on both sides of the mattress to remove dust mites and stains.",
        includes: ["Vacuuming both sides", "Shampoo and stain treatment", "Wet extraction"],
        excludes: ["Memory foam that cannot be wetted"],
        variants: [
          ["Single", 449, 549, 45],
          ["Double", 649, 799, 60],
        ],
      },
      {
        slug: "water-tank-cleaning",
        name: "Water tank cleaning",
        summary: "Overhead tanks and sumps emptied, scrubbed and disinfected.",
        description:
          "Draining, sludge removal, scrubbing, high-pressure rinse and disinfection for overhead tanks and underground sumps.",
        includes: ["Draining and sludge removal", "Wall and floor scrubbing", "High-pressure rinse", "Disinfection"],
        excludes: ["Tank repairs or leak sealing"],
        variants: [
          ["Up to 1,000 litres", 699, 849, 90],
          ["Up to 2,000 litres", 999, 1199, 120],
          ["Sump up to 5,000 litres", 1499, 1799, 150],
        ],
      },
      {
        slug: "move-in-move-out-cleaning",
        name: "Move-in or move-out cleaning",
        summary: "An empty home cleaned before you move in or hand back the keys.",
        description:
          "Deep cleaning of an empty home, including inside cabinets and wardrobes, so it is ready for moving in or handing over.",
        includes: ["All rooms, kitchen and bathrooms", "Inside of empty cabinets and wardrobes", "Windows, grills and fans"],
        excludes: ["Paint touch-ups", "Garbage disposal beyond normal bags"],
        variants: [
          ["1 BHK", 2999, 3599, 210],
          ["2 BHK", 3999, 4799, 270],
          ["3 BHK", 4999, 5999, 330],
        ],
      },
    ],
  },
  {
    slug: "ac-appliance-repair",
    name: "AC and appliance repair",
    tagline: "Service and repair at your door",
    description: "AC servicing, installation and repair, plus washing machine, refrigerator, RO and microwave repair.",
    icon: "air-vent",
    faqs: [
      visitFaq,
      {
        q: "Is there a warranty on repairs?",
        a: "Yes. Repairs carry a 30-day warranty on the same issue. Parts carry the manufacturer's warranty.",
      },
      rescheduleFaq,
    ],
    services: [
      {
        slug: "ac-service",
        name: "AC service with foam jet",
        summary: "Deep cleaning of filters, coils and drain for better cooling.",
        description:
          "Foam-jet cleaning of indoor coils and filters, outdoor unit wash, drain pipe flush and a cooling check.",
        includes: ["Filter and indoor coil foam-jet cleaning", "Outdoor unit washing", "Drain pipe flushing", "Cooling and gas pressure check"],
        excludes: ["Gas refilling (quoted after inspection)", "Spare parts"],
        variants: [
          ["Split AC", 549, 699, 60],
          ["Window AC", 499, 599, 60],
          ["2 split ACs", 999, 1398, 105],
        ],
        featured: true,
      },
      {
        slug: "ac-repair",
        name: "AC repair",
        summary: "Not cooling, water leak or noise diagnosed and fixed.",
        description: "A trained technician diagnoses the problem and quotes for any parts or gas before repairing.",
        includes: ["Inspection and diagnosis", "Minor repairs that need no parts"],
        excludes: ["Spare parts and gas refill (quoted on site)"],
        variants: [["Visit and diagnosis", 299, null, 45]],
      },
      {
        slug: "ac-installation",
        name: "AC installation and uninstallation",
        summary: "Split and window AC fitted or removed safely.",
        description: "Mounting, piping, wiring and testing for new split and window ACs, or safe removal of an old unit.",
        includes: ["Indoor and outdoor unit mounting", "Copper piping up to 3 metres", "Vacuuming and testing"],
        excludes: ["Extra copper pipe and stand (charged at rate card)", "Wall drilling through concrete beams"],
        variants: [
          ["Split AC installation", 1499, 1799, 120],
          ["Window AC installation", 799, 999, 60],
          ["Split AC uninstallation", 699, 849, 60],
        ],
      },
      {
        slug: "washing-machine-repair",
        name: "Washing machine repair",
        summary: "Top load, front load and semi-automatic machines repaired.",
        description: "Diagnosis and repair of drum, motor, drainage and electrical faults in all major brands.",
        includes: ["Inspection and diagnosis", "Minor repairs that need no parts"],
        excludes: ["Spare parts (quoted on site)"],
        variants: [["Visit and diagnosis", 299, null, 45]],
      },
      {
        slug: "refrigerator-repair",
        name: "Refrigerator repair",
        summary: "Cooling, compressor and gas issues fixed at home.",
        description: "Diagnosis and repair of single-door, double-door and side-by-side refrigerators.",
        includes: ["Inspection and diagnosis", "Minor repairs that need no parts"],
        excludes: ["Spare parts and gas refill (quoted on site)"],
        variants: [["Visit and diagnosis", 299, null, 45]],
      },
      {
        slug: "ro-water-purifier-service",
        name: "RO water purifier service",
        summary: "Filters cleaned or replaced for safe drinking water.",
        description: "Servicing and filter replacement for all major RO and UV purifier brands, with a water TDS check.",
        includes: ["Filter cleaning or replacement", "Tank cleaning", "TDS check"],
        excludes: ["Membrane and pump replacement (quoted on site)"],
        variants: [
          ["Service and cleaning", 399, 499, 45],
          ["Service with filter set replacement", 1499, 1799, 60],
        ],
      },
      {
        slug: "microwave-repair",
        name: "Microwave repair",
        summary: "Heating, turntable and panel faults repaired.",
        description: "Diagnosis and repair of solo, grill and convection microwaves.",
        includes: ["Inspection and diagnosis", "Minor repairs that need no parts"],
        excludes: ["Spare parts (quoted on site)"],
        variants: [["Visit and diagnosis", 249, null, 45]],
      },
    ],
  },
  {
    slug: "electrician",
    name: "Electrician",
    tagline: "Safe wiring, fittings and repairs",
    description: "Fans, lights, switches, inverters and wiring checks by verified electricians.",
    icon: "zap",
    faqs: [visitFaq, rescheduleFaq],
    services: [
      {
        slug: "fan-installation-repair",
        name: "Fan installation or repair",
        summary: "Ceiling and exhaust fans fitted, replaced or repaired.",
        description: "Installation of new fans, replacement of old ones and repair of noise, speed or regulator issues.",
        includes: ["Fitting and testing", "Removal of the old fan if needed"],
        excludes: ["Fan, capacitor and regulator parts"],
        variants: [
          ["Ceiling fan installation", 149, 199, 30],
          ["Fan repair", 199, 249, 45],
          ["Exhaust fan installation", 199, 249, 30],
        ],
      },
      {
        slug: "switch-socket-repair",
        name: "Switch and socket repair",
        summary: "Faulty switches, sockets and boards repaired or replaced.",
        description: "Replacement of switches and sockets and repair of switchboards, with a safety check.",
        includes: ["Replacement or repair", "Safety check"],
        excludes: ["Switches and sockets (bring your own or buy at rate card)"],
        variants: [
          ["Switch or socket replacement", 99, 129, 20],
          ["Switchboard repair", 249, 299, 45],
        ],
      },
      {
        slug: "light-installation",
        name: "Light installation",
        summary: "Tube lights, LED panels, chandeliers and decorative lights fitted.",
        description: "Installation of all types of lights, from simple LED fittings to chandeliers and decorative strips.",
        includes: ["Fitting and testing", "Basic wiring to an existing point"],
        excludes: ["New wiring runs", "Light fittings"],
        variants: [
          ["Tube or LED light", 129, 149, 20],
          ["Chandelier", 699, 849, 90],
          ["Decorative lights, per 10 metres", 299, 349, 45],
        ],
      },
      {
        slug: "inverter-installation",
        name: "Inverter installation",
        summary: "Inverter and battery installed and connected to your home.",
        description: "Placement, wiring and testing of a home inverter and battery.",
        includes: ["Placement and wiring", "Load check and testing"],
        excludes: ["Inverter, battery and extra cable"],
        variants: [["Inverter and battery", 549, 649, 60]],
      },
      {
        slug: "wiring-inspection",
        name: "Electrical wiring check",
        summary: "Tripping, sparking or old wiring inspected for safety.",
        description: "A full safety inspection of your home wiring with a written list of issues and a quote.",
        includes: ["Inspection of points, boards and earthing", "Written list of issues and quote"],
        excludes: ["Repair work (quoted separately)"],
        variants: [["Visit and inspection", 249, null, 45]],
      },
    ],
  },
  {
    slug: "plumber",
    name: "Plumber",
    tagline: "Leaks and fittings fixed fast",
    description: "Taps, leaks, toilets, blockages and water motors handled by verified plumbers.",
    icon: "droplets",
    faqs: [visitFaq, rescheduleFaq],
    services: [
      {
        slug: "tap-mixer-repair",
        name: "Tap and mixer repair",
        summary: "Dripping taps fixed, taps replaced and mixers installed.",
        description: "Repair of leaking taps, replacement of taps and installation of wall mixers.",
        includes: ["Repair or fitting", "Leak test"],
        excludes: ["Taps, mixers and spare parts"],
        variants: [
          ["Tap repair", 99, 129, 20],
          ["Tap replacement", 149, 179, 30],
          ["Wall mixer installation", 349, 449, 45],
        ],
      },
      {
        slug: "leakage-repair",
        name: "Leakage repair",
        summary: "Visible pipe leaks fixed and hidden leaks traced.",
        description: "Repair of exposed pipe leaks and inspection of concealed leaks with a quote for the fix.",
        includes: ["Inspection", "Repair of exposed leaks"],
        excludes: ["Breaking tiles or walls for concealed pipes (quoted separately)"],
        variants: [
          ["Exposed pipe leak repair", 199, 249, 45],
          ["Concealed leak inspection", 299, null, 60],
        ],
      },
      {
        slug: "toilet-repair",
        name: "Toilet repair and installation",
        summary: "Flush tanks repaired and western toilets installed.",
        description: "Repair of flush tanks and seat issues, and installation of new western toilets.",
        includes: ["Repair or installation", "Leak test"],
        excludes: ["Toilet, flush tank and spare parts"],
        variants: [
          ["Flush tank repair", 249, 299, 45],
          ["Western toilet installation", 1299, 1599, 120],
        ],
      },
      {
        slug: "drain-blockage-removal",
        name: "Drain blockage removal",
        summary: "Blocked sinks, basins and bathroom drains cleared.",
        description: "Clearing of blocked kitchen sinks, wash basins and bathroom drains with tools, not acid.",
        includes: ["Blockage removal", "Flow test"],
        excludes: ["Main sewer line blockages"],
        variants: [
          ["Sink or basin", 299, 349, 45],
          ["Bathroom drain", 349, 399, 45],
        ],
      },
      {
        slug: "water-motor-installation",
        name: "Water motor installation and repair",
        summary: "Motors and pumps installed or repaired.",
        description: "Installation of new water motors and pumps, and repair of existing ones.",
        includes: ["Installation or diagnosis", "Testing"],
        excludes: ["Motor, pump and spare parts"],
        variants: [
          ["Motor installation", 499, 599, 60],
          ["Motor repair visit", 299, null, 45],
        ],
      },
    ],
  },
  {
    slug: "carpenter",
    name: "Carpenter",
    tagline: "Furniture, doors and fittings",
    description: "Furniture repair and assembly, door locks, curtain rods, shelves and TV mounting.",
    icon: "hammer",
    faqs: [visitFaq, rescheduleFaq],
    services: [
      {
        slug: "furniture-repair",
        name: "Furniture repair",
        summary: "Broken beds, chairs, tables and drawers repaired.",
        description: "Repair of loose joints, broken hinges, drawer channels and other furniture faults.",
        includes: ["Inspection and diagnosis", "Minor repairs"],
        excludes: ["Wood, hinges and hardware (quoted on site)"],
        variants: [["Visit and diagnosis", 249, null, 45]],
      },
      {
        slug: "door-lock-installation",
        name: "Door lock and hinge work",
        summary: "Locks installed and sagging doors aligned.",
        description: "Installation of door locks and handles, and fixing of door alignment and hinges.",
        includes: ["Installation or alignment", "Testing"],
        excludes: ["Locks and hardware"],
        variants: [
          ["Lock installation", 199, 249, 30],
          ["Door hinge or alignment", 249, 299, 45],
        ],
      },
      {
        slug: "furniture-assembly",
        name: "Furniture assembly",
        summary: "Beds, wardrobes, tables and chairs assembled.",
        description: "Assembly of flat-pack and ready-to-assemble furniture from any brand.",
        includes: ["Assembly", "Packaging cleared to one spot"],
        excludes: ["Wall drilling for anchoring (charged at rate card)"],
        variants: [
          ["Bed", 599, 699, 90],
          ["Wardrobe", 799, 949, 120],
          ["Table or chair", 249, 299, 45],
        ],
      },
      {
        slug: "curtain-rod-shelf-installation",
        name: "Curtain rods, shelves and TV mounting",
        summary: "Curtain rods, wall shelves and TV mounts fitted firmly.",
        description: "Drilling and fitting of curtain rods, wall shelves and TV wall mounts.",
        includes: ["Drilling and fitting", "Level check"],
        excludes: ["Rods, shelves, brackets and mounts"],
        variants: [
          ["Curtain rod, per window", 149, 179, 30],
          ["Wall shelf", 199, 249, 30],
          ["TV wall mount", 449, 549, 45],
        ],
      },
    ],
  },
  {
    slug: "pest-control",
    name: "Pest control",
    tagline: "Odourless, family-safe treatments",
    description: "Cockroach, ant, termite, bed bug and mosquito control with government-approved chemicals.",
    icon: "bug",
    faqs: [
      {
        q: "Do I need to leave home during treatment?",
        a: "For cockroach and ant gel treatment, no. For spray treatments, stay out of treated rooms for 2 to 3 hours.",
      },
      {
        q: "Is there a warranty?",
        a: "Cockroach and ant treatments carry a 3-month service warranty. Termite treatment carries a 1-year warranty with one follow-up visit.",
      },
      rescheduleFaq,
    ],
    services: [
      {
        slug: "cockroach-ant-control",
        name: "Cockroach and ant control",
        summary: "Odourless gel and spray treatment for the kitchen and whole home.",
        description: "Gel baiting in the kitchen and spray in drains and corners, using government-approved, odourless chemicals.",
        includes: ["Gel treatment in kitchen and cabinets", "Spray in drains, corners and bathrooms", "3-month service warranty"],
        excludes: ["Treatment of outdoor gardens"],
        variants: [
          ["1 BHK", 899, 1099, 60],
          ["2 BHK", 1099, 1349, 75],
          ["3 BHK", 1399, 1699, 90],
        ],
        featured: true,
      },
      {
        slug: "termite-control",
        name: "Termite control",
        summary: "Drill-fill-seal treatment to stop termites in walls and wood.",
        description: "Drilling at wall bases and woodwork, chemical injection and sealing, with one follow-up visit.",
        includes: ["Drill, fill and seal treatment", "Woodwork spray", "1-year warranty with one follow-up"],
        excludes: ["Replacement of damaged wood"],
        variants: [
          ["1 BHK", 2999, 3599, 150],
          ["2 BHK", 3999, 4799, 180],
          ["3 BHK", 4999, 5999, 210],
        ],
      },
      {
        slug: "bed-bug-control",
        name: "Bed bug control",
        summary: "Two-visit treatment for beds, sofas and cracks.",
        description: "Spray treatment of beds, sofas, furniture joints and cracks, with a second visit after two weeks.",
        includes: ["Two treatment visits", "Beds, sofas and furniture joints"],
        excludes: ["Mattress replacement"],
        variants: [
          ["1 BHK", 1499, 1799, 90],
          ["2 BHK", 1899, 2299, 120],
        ],
      },
      {
        slug: "mosquito-control",
        name: "Mosquito control",
        summary: "Indoor and outdoor fogging and larvicide treatment.",
        description: "Treatment of breeding spots with larvicide and fogging of outdoor areas around the home.",
        includes: ["Larvicide treatment", "Outdoor fogging"],
        excludes: ["Treatment of neighbouring plots"],
        variants: [["Home and surroundings", 799, 949, 45]],
      },
    ],
  },
  {
    slug: "salon-for-women",
    name: "Salon for women",
    tagline: "Salon care at home",
    description: "Waxing, facials, manicure, pedicure and hair spa at home by trained beauticians.",
    icon: "flower",
    faqs: [
      {
        q: "What products do you use?",
        a: "Branded, single-use or sealed products. Ask your beautician to show you the pack before the service starts.",
      },
      {
        q: "Are the beauticians women?",
        a: "Yes. All salon-for-women services are done by trained women professionals.",
      },
      rescheduleFaq,
    ],
    services: [
      {
        slug: "waxing",
        name: "Waxing",
        summary: "Arms, legs and full body waxing with Rica or honey wax.",
        description: "Hygienic waxing with single-use spatulas and strips, using Rica or honey wax.",
        includes: ["Single-use spatulas and strips", "Pre and post wax care"],
        excludes: ["Face waxing (add on request)"],
        variants: [
          ["Full arms and underarms", 449, 549, 45],
          ["Full arms, full legs and underarms", 849, 999, 75],
          ["Full body with Rica wax", 1999, 2399, 120],
        ],
      },
      {
        slug: "facial-cleanup",
        name: "Facial and cleanup",
        summary: "Cleanups and facials for glowing, refreshed skin.",
        description: "Cleansing, scrubbing, massage and mask, with products chosen for your skin type.",
        includes: ["Cleansing and scrub", "Massage", "Mask"],
        excludes: ["Medical skin treatments"],
        variants: [
          ["Cleanup", 599, 699, 45],
          ["Fruit facial", 899, 1099, 60],
          ["Gold facial", 1299, 1599, 75],
        ],
      },
      {
        slug: "manicure-pedicure",
        name: "Manicure and pedicure",
        summary: "Nail shaping, cuticle care, scrub and massage.",
        description: "Soak, nail shaping, cuticle care, scrub, massage and polish for hands and feet.",
        includes: ["Soak and scrub", "Nail shaping and cuticle care", "Massage and polish"],
        excludes: ["Gel nails and extensions"],
        variants: [
          ["Manicure", 449, 549, 40],
          ["Pedicure", 549, 649, 45],
          ["Manicure and pedicure", 899, 1099, 80],
        ],
      },
      {
        slug: "hair-spa",
        name: "Hair spa",
        summary: "Nourishing hair spa for dry and frizzy hair.",
        description: "Oil massage, steam, deep conditioning mask and wash for healthy hair.",
        includes: ["Oil massage and steam", "Conditioning mask", "Hair wash"],
        excludes: ["Hair colouring and chemical treatments"],
        variants: [
          ["Hair spa", 899, 1099, 60],
          ["Hair spa and blow dry", 1199, 1449, 75],
        ],
      },
    ],
  },
  {
    slug: "salon-for-men",
    name: "Salon for men",
    tagline: "Haircuts and grooming at home",
    description: "Haircuts, beard grooming, facials and head massage at home.",
    icon: "scissors",
    faqs: [
      {
        q: "Do you clean up after the haircut?",
        a: "Yes. The professional lays a sheet before starting and clears all hair afterwards.",
      },
      rescheduleFaq,
    ],
    services: [
      {
        slug: "mens-haircut",
        name: "Haircut",
        summary: "Classic and modern haircuts at home.",
        description: "A haircut in the style you choose, with a sheet laid down and cleanup afterwards.",
        includes: ["Haircut and styling", "Cleanup after the service"],
        excludes: ["Hair colouring"],
        variants: [
          ["Haircut", 249, 299, 30],
          ["Haircut and beard", 349, 449, 45],
        ],
        featured: true,
      },
      {
        slug: "beard-grooming",
        name: "Beard grooming",
        summary: "Beard trim, shape and styling.",
        description: "Beard trimming, shaping and styling with clean, sanitised tools.",
        includes: ["Trim and shape", "Styling"],
        excludes: ["Beard colouring"],
        variants: [["Beard trim and styling", 149, 199, 20]],
      },
      {
        slug: "mens-facial",
        name: "Facial and cleanup for men",
        summary: "De-tan and cleanup to refresh tired skin.",
        description: "Cleansing, scrub, massage and mask made for men's skin.",
        includes: ["Cleansing and scrub", "Massage", "Mask"],
        excludes: ["Medical skin treatments"],
        variants: [
          ["Cleanup", 499, 599, 40],
          ["De-tan facial", 799, 949, 60],
        ],
      },
      {
        slug: "head-massage",
        name: "Head massage",
        summary: "Relaxing oil head massage.",
        description: "A relaxing head, neck and shoulder massage with your choice of oil.",
        includes: ["Head, neck and shoulder massage"],
        excludes: [],
        variants: [
          ["20 minutes", 249, 299, 20],
          ["40 minutes", 449, 549, 40],
        ],
      },
    ],
  },
  {
    slug: "painting-waterproofing",
    name: "Painting and waterproofing",
    tagline: "Fresh walls without the mess",
    description: "Room and home repainting with furniture covering and cleanup, plus waterproofing inspections.",
    icon: "paint-roller",
    faqs: [
      {
        q: "Is the paint included?",
        a: "Yes. Prices include putty touch-up, one primer coat and two coats of premium emulsion. Ask for a quote for luxury paints.",
      },
      rescheduleFaq,
    ],
    services: [
      {
        slug: "room-painting",
        name: "Room and home painting",
        summary: "Repainting with furniture covering, masking and cleanup.",
        description:
          "Wall preparation, putty touch-up, primer and two coats of premium emulsion, with furniture covered and the room cleaned afterwards.",
        includes: ["Furniture covering and masking", "Putty touch-up and primer", "Two coats of premium emulsion", "Cleanup"],
        excludes: ["Major wall repairs and seepage treatment", "Wood and metal polishing"],
        variants: [
          ["Single room repaint", 4999, 5999, 480],
          ["1 BHK repaint (2 days)", 12999, 15499, 960],
        ],
      },
      {
        slug: "waterproofing-inspection",
        name: "Waterproofing inspection",
        summary: "Dampness and seepage inspected, with a written quote.",
        description: "An expert inspects terraces, walls and bathrooms for seepage and gives a written treatment quote. The visit charge is adjusted in the final bill.",
        includes: ["Moisture inspection", "Written quote"],
        excludes: ["Treatment work (quoted separately)"],
        variants: [["Site inspection and quote", 199, null, 45]],
      },
    ],
  },
  {
    slug: "parties-events",
    name: "Parties and events",
    tagline: "Celebrations planned, decorated and served",
    description:
      "Catering, decoration, photography, entertainment and full planning for birthdays, weddings, functions and corporate events.",
    icon: "party-popper",
    faqs: [
      {
        q: "How early should I book?",
        a: "Book at least 3 days ahead for catering, decoration and planning, and 2 weeks ahead for weddings. Our event team calls you after booking to confirm the menu, theme and venue details.",
      },
      {
        q: "Can I change the menu or the decoration theme?",
        a: "Yes. The price shown is for the standard package. The event team shares options on the call, and any changes are priced and agreed before the event.",
      },
      {
        q: "Do you work at my venue?",
        a: "Yes. We work at homes, apartment clubhouses, function halls and offices in the city. Hall rent is not included.",
      },
      rescheduleFaq,
    ],
    services: [
      {
        slug: "catering-services",
        name: "Catering",
        summary: "Fresh buffet menus with chefs and serving staff.",
        description:
          "Freshly cooked veg and non-veg buffets for parties and functions, set up at your venue with chafing dishes, serving staff and cleanup.",
        includes: ["Your choice of dishes from our menu", "Cooking, buffet setup and serving staff", "Plates, cutlery and chafing dishes", "Cleanup after the meal"],
        excludes: ["Venue and hall rent", "Live counters (priced on the call)"],
        // Priced per plate with a menu: the packages are created from cateringMenu below.
        variants: [],
        featured: true,
      },
      {
        slug: "event-decor",
        name: "Event decoration",
        summary: "Balloon, floral and theme decor for any occasion.",
        description: "Balloon, floral and themed decoration for birthdays, house parties, functions and stage events, set up and removed by our team.",
        includes: ["Theme planning call", "Setup before the event", "Removal after the event"],
        excludes: ["Venue and hall rent", "Custom printed banners (priced on the call)"],
        variants: [
          ["Birthday balloon decor at home", 2499, 2999, 120],
          ["Theme decor with backdrop and lights", 6999, 8499, 180],
          ["Floral stage decor for functions", 14999, 17999, 300],
        ],
        featured: true,
      },
      {
        slug: "event-photography",
        name: "Photography and video",
        summary: "Candid photos and video of your event.",
        description: "Professional photographers and videographers for birthdays, functions and weddings, with edited photos delivered online.",
        includes: ["Photographer with professional camera", "Edited photos shared online within 7 days"],
        excludes: ["Printed albums (priced on the call)", "Drone shots"],
        variants: [
          ["Party photography, 3 hours", 4999, 5999, 180],
          ["Photo and video, 6 hours", 14999, 17999, 360],
          ["Pre-wedding shoot, half day", 19999, 24999, 300],
        ],
      },
      {
        slug: "wedding-planning",
        name: "Wedding planning",
        summary: "Venue, decor, catering and vendors planned for you.",
        description:
          "From venue selection to decor, catering and photography, our planners coordinate every vendor so the family can enjoy the day.",
        includes: ["Planning meeting and budget plan", "Vendor coordination", "A coordinator on the day"],
        excludes: ["Venue, catering and decor costs (quoted in the plan)"],
        variants: [
          ["Wedding planning consultation", 999, null, 60],
          ["Engagement or reception coordination", 24999, 29999, 480],
          ["Wedding day coordination", 49999, 59999, 600],
        ],
      },
      {
        slug: "event-planning-management",
        name: "Event planning and management",
        summary: "Birthdays, parties and corporate events, run end to end.",
        description: "One team plans and runs your event: schedule, vendors, setup, guests and cleanup, for parties at home and corporate events.",
        includes: ["Planning call and event schedule", "Vendor booking and coordination", "Event manager on the day"],
        excludes: ["Food, decor and venue costs (quoted in the plan)"],
        variants: [
          ["Event planning consultation", 499, null, 45],
          ["Birthday party management, up to 50 guests", 9999, 11999, 300],
          ["Corporate event management, half day", 24999, 29999, 300],
        ],
      },
      {
        slug: "entertainment",
        name: "Entertainment",
        summary: "DJs, magicians, anchors and kids' party hosts.",
        description: "Performers and hosts who keep guests of every age entertained: DJs with sound and lights, magicians, anchors and party game hosts.",
        includes: ["Performer and their equipment", "Sound check before the event"],
        excludes: ["Stage and venue power backup"],
        variants: [
          ["Kids party host with games, 2 hours", 3499, 3999, 120],
          ["Magic show, 1 hour", 4999, 5999, 60],
          ["Anchor or emcee, 3 hours", 5999, 6999, 180],
          ["DJ with sound and lights, 3 hours", 8999, 10999, 180],
        ],
      },
    ],
  },
  {
    slug: "home-maintenance",
    name: "Home maintenance",
    tagline: "Small jobs and regular care, sorted",
    description: "A handyman for the small jobs around the house, and a full home check-up that finds problems before they get expensive.",
    icon: "drill",
    faqs: [visitFaq, rescheduleFaq],
    services: [
      {
        slug: "handyman-visit",
        name: "Handyman for small jobs",
        summary: "A list of small fixes done in one visit.",
        description: "One skilled handyman for the small jobs that pile up: loose hinges, wall hooks, drilling, minor fittings and adjustments.",
        includes: ["Skilled handyman with tools", "Small fittings and adjustments"],
        excludes: ["Spare parts and hardware", "Electrical or plumbing work that needs a licensed professional"],
        variants: [
          ["Up to 1 hour of small jobs", 349, 449, 60],
          ["Up to 3 hours of small jobs", 899, 1099, 180],
        ],
      },
      {
        slug: "home-maintenance-checkup",
        name: "Home maintenance check-up",
        summary: "Wiring, plumbing, walls and fittings checked, with a report.",
        description:
          "A technician checks wiring, switches, taps, drains, leaks, doors and walls, and gives you a written report with what needs fixing and the cost.",
        includes: ["Electrical and plumbing check", "Seepage and wall check", "Written report with costs"],
        excludes: ["Repairs (booked separately at the report price)"],
        variants: [
          ["Full home check-up, 2 BHK", 999, 1299, 120],
          ["Full home check-up, 3 BHK", 1299, 1599, 150],
        ],
      },
    ],
  },
];

const coupons = [
  { code: "WELCOME100", description: "₹100 off your first booking above ₹999", type: "FLAT", value: 100, minOrder: 999, maxDiscount: null },
  { code: "CLEAN10", description: "10% off cleaning orders above ₹1,499, up to ₹300", type: "PERCENT", value: 10, minOrder: 1499, maxDiscount: 300 },
];

/* ---------------- Catering menu ---------------- */

/** [name, vegetarian, extra per plate for a premium dish] */
type Dish = [name: string, veg: boolean, extra?: number];
type Course = { key: string; name: string; fixed?: boolean; dishes: Dish[] };
/** Per course: [dishes in the plate price, fewest to pick, most to pick, extra per plate for each dish beyond the included ones] */
type Rule = [included: number, min: number, max: number, extra: number];
type Package = { name: string; price: number; mrp: number; mins: number; minGuests: number; maxGuests: number; rules: Record<string, Rule> };

const cateringMenu: { service: string; courses: Course[]; packages: Package[] } = {
  service: "catering-services",
  courses: [
    { key: "drinks", name: "Welcome drinks", dishes: [["Fresh lime soda", true], ["Rose milk", true], ["Buttermilk (majjiga)", true], ["Mango lassi", true], ["Badam milk", true], ["Watermelon juice", true]] },
    { key: "vstart", name: "Veg starters", dishes: [["Paneer tikka", true], ["Veg manchurian", true], ["Chilli baby corn", true], ["Hara bhara kebab", true], ["Corn cheese balls", true], ["Gobi 65", true], ["Mirchi bajji", true]] },
    { key: "nvstart", name: "Non-veg starters", dishes: [["Chicken 65", false], ["Chicken tikka", false], ["Apollo fish", false], ["Pepper chicken", false], ["Tandoori chicken", false, 40], ["Mutton seekh kebab", false, 60]] },
    {
      key: "vcurry",
      name: "Veg curries",
      dishes: [
        ["Paneer butter masala", true],
        ["Kadai paneer", true],
        ["Palak paneer", true],
        ["Malai kofta", true],
        ["Mirchi ka salan", true],
        ["Bagara baingan", true],
        ["Gutti vankaya curry", true],
        ["Mixed veg kurma", true],
        ["Chana masala", true],
        ["Aloo gobi masala", true],
      ],
    },
    {
      key: "nvcurry",
      name: "Non-veg curries",
      dishes: [["Andhra chicken curry", false], ["Butter chicken", false], ["Chicken korma", false], ["Gongura chicken", false], ["Egg masala curry", false], ["Fish curry", false, 40], ["Mutton curry", false, 80], ["Gongura mutton", false, 80]],
    },
    { key: "nvbiryani", name: "Non-veg biryani", dishes: [["Hyderabadi chicken dum biryani", false], ["Chicken fry piece biryani", false], ["Mutton dum biryani", false, 90]] },
    { key: "rice", name: "Rice and veg biryani", dishes: [["Veg dum biryani", true], ["Bagara rice", true], ["Jeera rice", true], ["Veg pulao", true], ["Pulihora (tamarind rice)", true], ["Lemon rice", true]] },
    { key: "dal", name: "Dal, sambar and rasam", dishes: [["Sambar", true], ["Tomato pappu", true], ["Dal tadka", true], ["Dal makhani", true], ["Palakura pappu", true], ["Rasam", true]] },
    { key: "fry", name: "Fry and poriyal", dishes: [["Aloo fry", true], ["Bhindi fry", true], ["Dondakaya fry", true], ["Cabbage poriyal", true], ["Beans poriyal", true]] },
    { key: "breads", name: "Breads", dishes: [["Butter naan", true], ["Tandoori roti", true], ["Rumali roti", true], ["Poori", true], ["Chapati", true]] },
    { key: "sweets", name: "Sweets", dishes: [["Double ka meetha", true], ["Gulab jamun", true], ["Gajar ka halwa", true], ["Semiya payasam", true], ["Bobbatlu", true], ["Rasmalai", true, 25], ["Qubani ka meetha", true, 30]] },
    { key: "served", name: "Always served", fixed: true, dishes: [["White rice", true], ["Curd rice", true], ["Curd", true], ["Green salad", true], ["Papad", true], ["Pickle", true], ["Mineral water", true]] },
  ],
  packages: [
    {
      name: "Veg Classic",
      price: 349,
      mrp: 399,
      mins: 360,
      minGuests: 50,
      maxGuests: 2000,
      rules: { drinks: [1, 1, 2, 20], vstart: [1, 1, 3, 30], vcurry: [2, 2, 4, 30], rice: [1, 1, 2, 25], dal: [1, 1, 2, 15], fry: [1, 1, 2, 15], breads: [1, 1, 2, 15], sweets: [1, 1, 3, 25] },
    },
    {
      name: "Veg Premium",
      price: 499,
      mrp: 579,
      mins: 360,
      minGuests: 50,
      maxGuests: 2000,
      rules: { drinks: [1, 1, 2, 20], vstart: [2, 2, 4, 30], vcurry: [3, 3, 5, 30], rice: [2, 2, 3, 25], dal: [1, 1, 2, 15], fry: [1, 1, 2, 15], breads: [2, 1, 3, 15], sweets: [2, 2, 4, 25] },
    },
    {
      name: "Veg and non-veg",
      price: 649,
      mrp: 749,
      mins: 360,
      minGuests: 50,
      maxGuests: 2000,
      rules: {
        drinks: [1, 1, 2, 20],
        vstart: [1, 1, 3, 30],
        nvstart: [1, 1, 3, 50],
        vcurry: [2, 2, 4, 30],
        nvcurry: [2, 2, 4, 50],
        nvbiryani: [1, 1, 2, 60],
        rice: [1, 0, 2, 25],
        dal: [1, 1, 2, 15],
        breads: [1, 1, 2, 15],
        sweets: [2, 2, 4, 25],
      },
    },
  ],
};

/**
 * Gives catering its per-plate packages and menu, once: only when the service has no menu yet.
 * Older fixed-size buffet options are switched off (bookings that used them keep them).
 */
async function seedCateringMenu() {
  const svc = await db.service.findUnique({ where: { slug: cateringMenu.service }, include: { menuCourses: { select: { id: true } } } });
  if (!svc || svc.menuCourses.length) return;
  await db.serviceVariant.updateMany({ where: { serviceId: svc.id, unit: "job" }, data: { active: false } });
  const courseIds = new Map<string, string>();
  for (const [ci, c] of cateringMenu.courses.entries()) {
    const course = await db.menuCourse.create({
      data: {
        serviceId: svc.id,
        name: c.name,
        fixed: Boolean(c.fixed),
        sortOrder: ci,
        dishes: { create: c.dishes.map(([name, veg, extra], di) => ({ name, veg, extraPrice: extra ?? 0, sortOrder: di })) },
      },
    });
    courseIds.set(c.key, course.id);
  }
  for (const [pi, p] of cateringMenu.packages.entries()) {
    await db.serviceVariant.create({
      data: {
        serviceId: svc.id,
        name: p.name,
        price: p.price,
        mrp: p.mrp,
        durationMins: p.mins,
        unit: "plate",
        minGuests: p.minGuests,
        maxGuests: p.maxGuests,
        sortOrder: pi,
        menuRules: {
          create: Object.entries(p.rules).map(([key, [included, minPick, maxPick, extraPrice]]) => ({ courseId: courseIds.get(key)!, included, minPick, maxPick, extraPrice })),
        },
      },
    });
  }
}

async function main() {
  for (const c of cities) {
    await db.city.upsert({ where: { slug: c.slug }, update: { name: c.name, state: c.state }, create: c });
  }

  for (const [ci, cat] of catalog.entries()) {
    const category = await db.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug,
        name: cat.name,
        tagline: cat.tagline,
        description: cat.description,
        icon: cat.icon,
        image: `/img/cat/${cat.slug}.jpg`,
        sortOrder: ci,
      },
    });
    for (const [si, s] of cat.services.entries()) {
      const fields = {
        name: s.name,
        summary: s.summary,
        description: s.description,
        includes: JSON.stringify(s.includes),
        excludes: JSON.stringify(s.excludes),
        faqs: JSON.stringify(cat.faqs),
        featured: Boolean(s.featured),
        sortOrder: si,
      };
      const image = s.image ?? serviceImage(s.slug);
      const existing = await db.service.findUnique({ where: { slug: s.slug } });
      if (existing) {
        // Leave admin edits alone; only fill in a photo where none is set.
        if (!existing.image && image) await db.service.update({ where: { id: existing.id }, data: { image } });
        continue;
      }
      await db.service.create({
        data: {
          ...fields,
          slug: s.slug,
          categoryId: category.id,
          image,
          variants: {
            create: s.variants.map(([name, price, mrp, durationMins], vi) => ({
              name,
              price,
              mrp,
              durationMins,
              sortOrder: vi,
            })),
          },
        },
      });
    }
  }

  for (const c of coupons) {
    await db.coupon.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  await seedCateringMenu();

  const counts = await Promise.all([db.city.count(), db.category.count(), db.service.count(), db.serviceVariant.count()]);
  console.log(`Seeded ${counts[0]} cities, ${counts[1]} categories, ${counts[2]} services, ${counts[3]} price options.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
