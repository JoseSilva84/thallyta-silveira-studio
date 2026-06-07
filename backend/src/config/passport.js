import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import prisma from './prisma.js';

dotenv.config();

// Só registra a estratégia Google se as credenciais estiverem configuradas
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true, // Necessário quando o backend roda no Render (atrás de proxy)
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email não disponível no perfil Google'), null);

          // Busca ou cria o usuário no banco
          let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

          if (!user) {
            // Verifica se já existe uma conta com o mesmo email (cadastro manual)
            const existingByEmail = await prisma.user.findUnique({ where: { email } });
            if (existingByEmail) {
              // Vincula o googleId à conta existente
              user = await prisma.user.update({
                where: { email },
                data: { googleId: profile.id },
              });
            } else {
              // Cria um novo usuário cliente
              user = await prisma.user.create({
                data: {
                  name: profile.displayName || email.split('@')[0],
                  email,
                  googleId: profile.id,
                  role: 'CLIENT',
                },
              });
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('✅ Google OAuth configurado.');
} else {
  console.warn('⚠️  Google OAuth NÃO configurado (GOOGLE_CLIENT_ID ausente). Login com Google desativado.');
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
