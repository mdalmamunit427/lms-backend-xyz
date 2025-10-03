// src/modules/users/user.repository.ts

import { ClientSession } from 'mongoose';
import User, { IUser } from './user.model';

// --- READ Operations ---

export const findUserByEmail = (email: string): Promise<IUser | null> => {
  return User.findOne({ email });
};

export const findUserForLogin = (email: string): Promise<IUser | null> => {
  return User.findOne({ email }).select('+password');
};

export const findUserForActivation = (email: string): Promise<IUser | null> => {
  return User.findOne({ email }).select('+activationCode +activationCodeExpiry');
};

export const findUserById = (userId: string): Promise<IUser | null> => {
  return User.findById(userId).select('-password');
};

export const findUserForTokenRefresh = (userId: string): Promise<IUser | null> => {
    return User.findById(userId).select('+refreshToken');
};

export const findUserForPasswordReset = (email: string): Promise<IUser | null> => {
    return User.findOne({ email }).select('+password +resetPasswordOtp +resetPasswordOtpExpiry');
};

export const findUserForPasswordResetById = (userId: string): Promise<IUser | null> => {
  return User.findById(userId).select('+password');
};

export const findUserForOtpReset = (email: string): Promise<IUser | null> => {
    return User.findOne({ email }).select('+password +resetPasswordOtp +resetPasswordOtpExpiry');
};

// --- WRITE Operations ---

export const saveUser = (user: IUser, session?: ClientSession): Promise<IUser> => {
  return user.save({ session });
};

export const updateProfileData = (userId: string, updateData: any): Promise<IUser | null> => {
  return User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select('-password');
};

export const updateRefreshToken = (user: IUser, refreshToken: string, expiry: Date): Promise<IUser> => {
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = expiry;
    return user.save();
};

export const updateUserRole = (userId: string, role: string): Promise<IUser | null> => {
  return User.findByIdAndUpdate(
    userId, 
    { role }, 
    { 
      new: true, 
      runValidators: true 
    }
  ).select('-password');
};