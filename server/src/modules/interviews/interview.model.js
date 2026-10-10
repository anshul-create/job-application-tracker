import mongoose from 'mongoose';

const RESULTS = ['pending', 'passed', 'failed', 'cancelled'];

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    roundName: {
      type: String,
      required: [true, 'Round name is required.'],
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date is required.'],
    },
    meetingUrl: {
      type: String,
      trim: true,
    },
    result: {
      type: String,
      enum: RESULTS,
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

interviewSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.applicationId) obj.applicationId = obj.applicationId.toString();
  return obj;
};

export const ALLOWED_RESULTS = RESULTS;
export const Interview = mongoose.model('Interview', interviewSchema);
