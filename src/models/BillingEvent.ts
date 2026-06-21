import mongoose from "mongoose";

const BillingEventSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      // Optional if it's a global Stripe webhook checking before org mapping
      required: false,
    },

    type: {
      type: String,
      required: [true, "Billing event type is required"],
    },

    amountUSD: {
      type: Number,
      default: 0.0,
    },

    minutes: {
      type: Number,
      default: 0,
    },

    stripeEventId: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },

    vapiCallId: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes
BillingEventSchema.index({ stripeEventId: 1 }, { unique: true, sparse: true });
BillingEventSchema.index({ orgId: 1, createdAt: -1 });

export default mongoose.models.BillingEvent ||
  mongoose.model("BillingEvent", BillingEventSchema);
