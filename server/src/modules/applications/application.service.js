import { Application } from './application.model.js';
import { Interview } from '../interviews/interview.model.js';
import { AppError } from '../../utils/AppError.js';

export async function createApplication(userId, data) {
  const application = await Application.create({ userId, ...data });
  return application;
}

export async function listApplications(userId, { page, limit, search, status, sortBy, sortOrder }) {
  const filter = { userId };

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ company: regex }, { role: regex }];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [applications, totalItems] = await Promise.all([
    Application.find(filter).sort(sort).skip(skip).limit(limit),
    Application.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    applications,
    pagination: { page, limit, totalItems, totalPages },
  };
}

export async function getApplicationById(applicationId, userId) {
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) {
    throw new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND');
  }
  return application;
}

export async function updateApplication(applicationId, userId, updates) {
  const application = await Application.findOneAndUpdate(
    { _id: applicationId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!application) {
    throw new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND');
  }

  return application;
}

export async function deleteApplication(applicationId, userId) {
  const result = await Application.deleteOne({ _id: applicationId, userId });

  if (result.deletedCount === 0) {
    throw new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND');
  }

  // Cascade — delete all associated interviews
  await Interview.deleteMany({ applicationId });

  return result;
}
