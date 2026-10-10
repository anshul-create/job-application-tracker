import { createInterview, listInterviews, updateInterview, deleteInterview } from './interview.service.js';

export async function create(req, res, next) {
  try {
    const interview = await createInterview(req.params.applicationId, req.userId, req.body);
    return res.status(201).json({
      success: true,
      data: { interview },
    });
  } catch (err) {
    return next(err);
  }
}

export async function list(req, res, next) {
  try {
    const interviews = await listInterviews(req.params.applicationId, req.userId);
    return res.status(200).json({
      success: true,
      data: { interviews },
    });
  } catch (err) {
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    const interview = await updateInterview(req.params.interviewId, req.userId, req.body);
    return res.status(200).json({
      success: true,
      data: { interview },
    });
  } catch (err) {
    return next(err);
  }
}


export async function remove(req, res, next) {
  try {
    await deleteInterview(req.params.interviewId, req.userId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
