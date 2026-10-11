require("dotenv").config();
const connectDB = require("../config/db");
const Report = require("../models/Report");

// Same demo reports the frontend falls back to when it can't reach the API
// (see public/js/dashboard.js), so seeding the database and browsing without
// it produce a near-identical dashboard. Coordinates are placeholder demo
// points scattered around ATBU Gubi Campus's library (10.4689°N, 9.8303°E),
// not surveyed building locations.
const SAMPLE_REPORTS = [
  {
    category: "suspicious",
    severity: "medium",
    location: "Behind Hostel C",
    description: "Man in a black jacket loitering near the girls' hostel gate, side lane. Not a student — no ID visible.",
    isAnonymous: true,
    lat: 10.4696, lng: 9.8295,
  },
  {
    category: "theft",
    severity: "high",
    location: "New Male Hostel, Block B",
    description: "My phone was taken from my table while I stepped out to the bathroom around 9pm. Room door was unlocked for less than 5 minutes.",
    isAnonymous: false,
    reporterName: "Amina B.",
    lat: 10.4702, lng: 9.8310,
  },
  {
    category: "hazard",
    severity: "medium",
    location: "Pathway between SICT and the Library",
    description: "Streetlight has been out for about a week now. Very dark by 7pm, hard to see the potholes.",
    isAnonymous: false,
    reporterName: "Ibrahim T.",
    lat: 10.4688, lng: 9.8300,
  },
  {
    category: "harassment",
    severity: "high",
    location: "Junction near the Faculty of Computing",
    description: "A group of guys have been catcalling girls walking past that junction every evening this week.",
    isAnonymous: true,
    lat: 10.4680, lng: 9.8315,
  },
  {
    category: "theft",
    severity: "medium",
    location: "Basketball court, evening",
    description: "Bag left on the bench for two minutes and a wallet went missing from it.",
    isAnonymous: true,
    lat: 10.4693, lng: 9.8288,
  },
  {
    category: "suspicious",
    severity: "low",
    location: "Around the generator house, Female Hostel",
    description: "Same unfamiliar face seen twice this week, just standing around after dark.",
    isAnonymous: false,
    reporterName: "Chiamaka O.",
    lat: 10.4705, lng: 9.8299,
  },
  {
    category: "hazard",
    severity: "medium",
    location: "Stairs, old Engineering block",
    description: "Handrail on the second floor stairs is loose — wobbles badly if you lean on it.",
    isAnonymous: false,
    reporterName: "Yusuf A.",
    lat: 10.4675, lng: 9.8292,
  },
  {
    category: "harassment",
    severity: "high",
    location: "Off-campus shuttle stop",
    description: "Okada rider following and pestering a group of female students after they declined a ride.",
    isAnonymous: true,
    lat: 10.4670, lng: 9.8320,
  },
];

async function seed() {
  await connectDB();

  const existing = await Report.countDocuments();
  if (existing > 0) {
    console.log(`Reports collection already has ${existing} document(s). Skipping seed.`);
    console.log("Run with --force to wipe and reseed: node seed/seedReports.js --force");
    if (!process.argv.includes("--force")) {
      process.exit(0);
    }
    await Report.deleteMany({});
    console.log("Existing reports cleared (--force).");
  }

  await Report.insertMany(SAMPLE_REPORTS);
  console.log(`Seeded ${SAMPLE_REPORTS.length} sample reports.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
