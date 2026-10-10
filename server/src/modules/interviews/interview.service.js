import { Interview } from './interview.model.js';
import { Application } from '../applications/application.model.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Verify the application belongs to the user, then create the interview.
 */
export async function createInterview(applicationId, userId, data) {
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) {
    throw new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND');
  }

  const interview = await Interview.create({ applicationId, ...data });
  return interview;
}

/**
 * Verify ownership, then return all interviews for the application.
 */
export async function listInterviews(applicationId, userId) {
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) {
    throw new AppError('Application not found.', 404, 'APPLICATION_NOT_FOUND');
  }

  const interviews = await Interview.find({ applicationId }).sort({ scheduledAt: 1 });
  return interviews;
}

/**
 * Update an interview — ownership verified through the associated application.
 */
export async function updateInterview(interviewId, userId, updates) {
  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new AppError('Interview not found.', 404, 'INTERVIEW_NOT_FOUND');
  }

  // Verify the interview belongs to an application owned by this user
  const application = await Application.findOne({
    _id: interview.applicationId,
    userId,
  });
  if (!application) {
    throw new AppError('Interview not found.', 404, 'INTERVIEW_NOT_FOUND');
  }

  Object.assign(interview, updates);
  await interview.save();

  return interview;
}

/**
 * Delete an interview — ownership verified through the associated application.
 */
export async function deleteInterview(interviewId, userId) {
  const interview = await Interview.findById(interviewId);
  if (!interview) {
    throw new AppError('Interview not found.', 404, 'INTERVIEW_NOT_FOUND');
  }

  const application = await Application.findOne({
    _id: interview.applicationId,
    userId,
  });
  if (!application) {
    throw new AppError('Interview not found.', 404, 'INTERVIEW_NOT_FOUND');
  }

  await interview.deleteOne();
}
