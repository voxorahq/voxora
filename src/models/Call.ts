import mongoose from "mongoose";

const CallSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },

    callId: {
      type: String,
      unique: true,
      required: [true, "Vapi Call ID is required"],
    },

    customerPhone: {
      type: String,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: 0,
    },

    durationMinutes: {
      type: Number,
      default: 0,
    },

    billedToBasePlanMinutes: {
      type: Number,
      default: 0,
    },

    billedToPrepaidWalletUSD: {
      type: Number,
      default: 0.0,
    },

    providerRawCostUSD: {
      type: Number,
      default: 0.0,
    },

    recordingUrl: {
      type: String,
      default: null,
    },

    transcript: {
      type: String,
      default: null,
    },

    summary: {
      type: String,
      default: null,
    },

    terminationReason: {
      type: String,
      default: null,
    },

    promptVersion: {
      type: String,
      default: "v1.0.0",
    },

    processed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
CallSchema.index({ callId: 1 }, { unique: true });
CallSchema.index({ orgId: 1, createdAt: -1 });

export default mongoose.models.Call ||
  mongoose.model("Call", CallSchema);
