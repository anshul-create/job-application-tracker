import mongoose from 'mongoose';
import { Application } from '../applications/application.model.js';
import { Interview } from '../interviews/interview.model.js';

const ALL_STATUSES = ['saved', 'applied', 'online_assessment', 'interview', 'offer', 'rejected', 'withdrawn'];

export async function getSummary(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Total applications
  const totalApplications = await Application.countDocuments({ userId });

  // Status counts — use aggregate to group by status
  const statusAgg = await Application.aggregate([
    { $match: { userId: userObjectId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Build full status counts object with zeros for missing statuses
  const statusCounts = {};
  for (const status of ALL_STATUSES) {
    statusCounts[status] = 0;
  }
  for (const row of statusAgg) {
    statusCounts[row._id] = row.count;
  }

  // Upcoming interviews — future date, pending result, sorted by earliest
  const now = new Date();
  const upcoming = await Interview.find({
    result: 'pending',
    scheduledAt: { $gte: now },
  })
    .sort({ scheduledAt: 1 })
    .lean();

  // Filter to only interviews belonging to this user's applications
  // and enrich with company/role from the application
  const appIds = upcoming.map((i) => i.applicationId);
  const apps = await Application.find({ _id: { $in: appIds }, userId })
    .lean()
    .then((docs) => new Map(docs.map((a) => [a._id.toString(), a])));

  const upcomingInterviews = upcoming
    .filter((i) => apps.has(i.applicationId.toString()))
    .map((i) => {
      const app = apps.get(i.applicationId.toString());
      return {
        id: i._id.toString(),
        applicationId: i.applicationId.toString(),
        company: app.company,
        role: app.role,
        roundName: i.roundName,
        scheduledAt: i.scheduledAt,
      };
    });

  return {
    totalApplications,
    statusCounts,
    upcomingInterviews,
  };
}
