const mongoose = require("mongoose");

const INCIDENT_CATEGORIES = ["theft", "harassment", "hazard", "suspicious"];
const SEVERITY_LEVELS = ["low", "medium", "high"];

const reportSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: INCIDENT_CATEGORIES,
      required: [true, "Incident category is required"],
    },
    // How serious the reporter thinks this is. Drives the pin colour on the
    // dashboard map (low = green, medium = amber, high = red). Reports saved
    // before this field existed simply read back as "medium".
    severity: {
      type: String,
      enum: { values: SEVERITY_LEVELS, message: "Severity must be low, medium or high" },
      default: "medium",
    },
    description: {
      type: String,
      required: [true, "A description of what happened is required"],
      trim: true,
      maxlength: 1000,
    },
    location: {
      type: String,
      required: [true, "A location is required"],
      trim: true,
      maxlength: 200,
    },
    // GPS coordinates are optional — a student may decline location
    // permission and rely on the free-text `location` field alone.
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },

    isAnonymous: {
      type: Boolean,
      default: true,
    },
    // Only populated when isAnonymous is false. Kept as a plain string
    // for now rather than a ref to a User account, since the site does
    // not yet require students to log in before submitting a named report.
    reporterName: {
      type: String,
      trim: true,
      maxlength: 100,
      // Required only when the report is not anonymous.
      required: [
        function () {
          return this.isAnonymous === false;
        },
        "A name is required when reporting under your identity",
      ],
    },

    // Reserved for once account-based reporting is wired up.
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

// Newest reports first is the default read pattern for the dashboard.
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
module.exports.INCIDENT_CATEGORIES = INCIDENT_CATEGORIES;
module.exports.SEVERITY_LEVELS = SEVERITY_LEVELS;
