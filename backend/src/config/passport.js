import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import prisma from './prisma.js';

dotenv.config();

const googleUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  googleId: true,
  dateOfBirth: true,
  whatsappPhone: true,
  whatsappOptIn: true,
  whatsappUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
};

const isMissingAvatarColumn = (error) =>
  error?.code === 'P2022' && String(error?.meta?.column || '').includes('avatarUrl');

const saveGoogleAvatar = async (user, avatarUrl) => {
  if (!avatarUrl) return user;

  try {
    return await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });
  } catch (error) {
    if (!isMissingAvatarColumn(error)) throw error;
    console.warn('Coluna avatarUrl ainda não foi migrada; login Google continuará sem foto.');
    return user;
  }
};

const getGoogleCallbackUrl = () => {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/auth/google/callback`;
  }
  return '/api/auth/google/callback';
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getGoogleCallbackUrl(),
        proxy: true,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const avatarUrl = profile.photos?.[0]?.value || null;
          if (!email) return done(new Error('Email nao disponivel no perfil Google'), null);

          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
            select: googleUserSelect,
          });

          if (!user) {
            const existingByEmail = await prisma.user.findUnique({
              where: { email },
              select: googleUserSelect,
            });
            if (existingByEmail) {
              user = await prisma.user.update({
                where: { email },
                data: { googleId: profile.id },
                select: googleUserSelect,
              });
            } else {
              user = await prisma.user.create({
                data: {
                  name: profile.displayName || email.split('@')[0],
                  email,
                  googleId: profile.id,
                  role: 'CLIENT',
                },
                select: googleUserSelect,
              });
            }
          }

          user = await saveGoogleAvatar(user, avatarUrl);
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('Google OAuth configurado.');
} else {
  console.warn('Google OAuth nao configurado. Login com Google desativado.');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
