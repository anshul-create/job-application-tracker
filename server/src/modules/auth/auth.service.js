import jwt from 'jsonwebtoken';
import { User } from './user.model.js';
import { AppError } from '../../utils/AppError.js';
import { env } from '../../config/env.js';

export async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email is already registered.', 409, 'EMAIL_ALREADY_EXISTS');
  }
  const user = await User.create({ name, email, password });
  return user;
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }
  const token = jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
  return { user, token };
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }
  return user;
}
