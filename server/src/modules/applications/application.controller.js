import { createApplication } from './application.service.js';

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
