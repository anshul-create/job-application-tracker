import { Application } from './application.model.js';
import { AppError } from '../../utils/AppError.js';

export async function createApplication(userId, data) {
  const application = await Application.create({ userId, ...data });
  return application;
}

export async function getApplicationById(applicationId, userId) {
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) {
    throw new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND');
  }
  return application;
}
