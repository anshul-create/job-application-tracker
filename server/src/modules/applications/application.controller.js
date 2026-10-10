import { createApplication, listApplications, getApplicationById, updateApplication, deleteApplication } from './application.service.js';

export async function create(req, res, next) {
  try {
    const application = await createApplication(req.userId, req.body);
    return res.status(201).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    return next(err);
  }
}

export async function list(req, res, next) {
  try {
    const { applications, pagination } = await listApplications(req.userId, req.query);
    return res.status(200).json({
      success: true,
      data: { applications, pagination },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const application = await getApplicationById(req.params.applicationId, req.userId);
    return res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    const application = await updateApplication(req.params.applicationId, req.userId, req.body);
    return res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (err) {
    return next(err);
  }
}


export async function remove(req, res, next) {
  try {
    await deleteApplication(req.params.applicationId, req.userId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
