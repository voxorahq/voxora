import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      unique: true,
      required: [true, "Organization ID is required"],
    },

    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true,
    },

    stripeSubscriptionId: {
      type: String,
      unique: true,
      sparse: true,
    },

    subscriptionTier: {
      type: String,
      enum: ["free", "starter", "professional"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: ["inactive", "active", "past_due", "canceled"],
      default: "inactive",
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    baseMinutesAllocated: {
      type: Number,
      default: 0,
    },

    baseMinutesUsed: {
      type: Number,
      default: 0,
    },

    walletBalanceUSD: {
      type: Number,
      default: 0.0,
    },

    // Concurrent call reservation protection
    currentActiveCalls: {
      type: Number,
      default: 0,
    },

    pendingReservedMinutes: {
      type: Number,
      default: 0,
    },

    pendingReservedUSD: {
      type: Number,
      default: 0.0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Subscription ||
  mongoose.model("Subscription", SubscriptionSchema);
