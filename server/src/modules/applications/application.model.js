import mongoose from 'mongoose';

const STATUSES = ['saved', 'applied', 'online_assessment', 'interview', 'offer', 'rejected', 'withdrawn'];
const PERIODS = ['YEARLY', 'MONTHLY', 'HOURLY'];

const salarySchema = new mongoose.Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'INR' },
    period: { type: String, enum: PERIODS, default: 'MONTHLY' },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required.'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required.'],
      trim: true,
    },
    jobUrl: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    salary: salarySchema,
    status: {
      type: String,
      enum: STATUSES,
      default: 'saved',
    },
    appliedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Shape the JSON output to match the API contract
applicationSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.userId) obj.userId = obj.userId.toString();
  return obj;
};

export const ALLOWED_STATUSES = STATUSES;
export const Application = mongoose.model('Application', applicationSchema);
