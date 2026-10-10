import { getSummary } from './dashboard.service.js';

export async function summary(req, res, next) {
  try {
    const data = await getSummary(req.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return next(err);
  }
}
