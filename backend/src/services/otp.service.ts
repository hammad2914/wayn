import { prisma } from '../lib/prisma';

export const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const saveOTP = async (userId: string, code: string) => {
  await prisma.oTP.updateMany({ where: { userId, used: false }, data: { used: true } });
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return prisma.oTP.create({ data: { userId, code, expiresAt } });
};

export const saveOTPWithExpiry = async (userId: string, code: string, expiryMinutes: number) => {
  await prisma.oTP.updateMany({ where: { userId, used: false }, data: { used: true } });
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return prisma.oTP.create({ data: { userId, code, expiresAt } });
};

export const validateOTP = async (userId: string, code: string) => {
  const otp = await prisma.oTP.findFirst({
    where: {
      userId,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });
  return otp;
};

export const markOTPUsed = async (id: string) =>
  prisma.oTP.update({ where: { id }, data: { used: true } });
