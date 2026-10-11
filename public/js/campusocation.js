// ============================================================
// campus-locations.js — popular campus points ("landmarks").
//
// Used in two places:
//   * dashboard.js draws each entry as a marker on the map.
//   * report.js offers them in a "pick a campus spot" dropdown,
//     so a report with no GPS can still be placed on the map.
//
// !! IMPORTANT: the coordinates below are APPROXIMATE starter values
// !! taken from this project's demo data. Replace them with real ones:
// !! on Google Maps, right-click the spot -> click the lat,lng numbers
// !! at the top of the menu to copy them, then paste here.
//
// To add a place (lecture hall, faculty, gate...), add one line:
//   { id: "lt1", name: "Lecture Theatre 1", type: "academic",
//     lat: 10.0000, lng: 9.0000, aliases: ["lt1", "lecture theatre 1"] }
//
// type: "hostel" | "academic" | "recreation" | "transport" | "pathway" | "facility" | "other"
// aliases (optional): lowercase words that, if found in a report's typed
//   location, place that report at this landmark.
// ============================================================
const CAMPUS_LOCATIONS = [
  { id: "library",      name: "Library",                    type: "academic",   lat: 10.4689, lng: 9.8303, aliases: ["library"] },
  { id: "foc-junction", name: "Faculty of Computing junction", type: "academic", lat: 10.4680, lng: 9.8315, aliases: ["faculty of computing", "computing junction"] },
  { id: "old-eng",      name: "Old Engineering block",      type: "academic",   lat: 10.4675, lng: 9.8292, aliases: ["engineering block", "old engineering"] },
  { id: "sict-path",    name: "SICT–Library pathway",       type: "pathway",    lat: 10.4688, lng: 9.8300, aliases: ["sict", "pathway between sict"] },
  { id: "hostel-c",     name: "Hostel C",                   type: "hostel",     lat: 10.4696, lng: 9.8295, aliases: ["hostel c", "block c"] },
  { id: "new-male",     name: "New Male Hostel (Block B)",  type: "hostel",     lat: 10.4702, lng: 9.8310, aliases: ["new male hostel", "male hostel"] },
  { id: "female-hostel",name: "Female Hostel",              type: "hostel",     lat: 10.4705, lng: 9.8299, aliases: ["female hostel", "generator house"] },
  { id: "basketball",   name: "Basketball court",           type: "recreation", lat: 10.4693, lng: 9.8288, aliases: ["basketball"] },
  { id: "shuttle",      name: "Shuttle stop (off-campus)",  type: "transport",  lat: 10.4670, lng: 9.8320, aliases: ["shuttle"] },
];

const LANDMARK_TYPE_META = {
  hostel:     { label: "Hostels",        icon: "🏠" },
  academic:   { label: "Academic",       icon: "🏫" },
  recreation: { label: "Recreation",     icon: "⚽" },
  transport:  { label: "Transport",      icon: "🚌" },
  pathway:    { label: "Pathways",       icon: "🛤️" },
  facility:   { label: "Facilities",     icon: "🏢" },
  other:      { label: "Other",          icon: "📌" },
};