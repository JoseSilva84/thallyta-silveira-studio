import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const PRODUCTION_FRONTEND_URL = 'https://www.thallytasilveira.com.br';

const getFrontendUrl = () => {
  if (process.env.PUBLIC_FRONTEND_URL) {
    return process.env.PUBLIC_FRONTEND_URL.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_FRONTEND_URL;
  }

  return (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)[0];
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      dateOfBirth: user.dateOfBirth,
      whatsappPhone: user.whatsappPhone,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const baseUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  dateOfBirth: true,
  whatsappPhone: true,
  whatsappOptIn: true,
  whatsappUpdatedAt: true,
  createdAt: true,
};

const userSelect = {
  ...baseUserSelect,
  avatarUrl: true,
};

const legacyUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  whatsappPhone: true,
  whatsappOptIn: true,
  whatsappUpdatedAt: true,
  createdAt: true,
};

const isMissingOptionalUserColumn = (error) => {
  const column = String(error?.meta?.column || '');
  return error?.code === 'P2022' && (column.includes('avatarUrl') || column.includes('dateOfBirth'));
};

const findPublicUser = async (userId) => {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
  } catch (error) {
    if (!isMissingOptionalUserColumn(error)) throw error;
    console.warn('Coluna avatarUrl ainda não foi migrada; perfil carregado sem foto.');
    return prisma.user.findUnique({
      where: { id: userId },
      select: legacyUserSelect,
    });
  }
};

const normalizeWhatsappPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;

  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;

  if (withCountryCode.length < 12 || withCountryCode.length > 13) {
    throw new Error('Informe um WhatsApp valido com DDD.');
  }

  return withCountryCode;
};

const normalizeDateOfBirth = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Informe uma data de nascimento valida.');
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isSameDate =
    date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);

  if (!isSameDate) {
    throw new Error('Informe uma data de nascimento valida.');
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (date > todayUtc) {
    throw new Error('A data de nascimento nao pode ser futura.');
  }

  return date;
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl,
  dateOfBirth: user.dateOfBirth,
  whatsappPhone: user.whatsappPhone,
  whatsappOptIn: user.whatsappOptIn,
  whatsappUpdatedAt: user.whatsappUpdatedAt,
});

export const register = async (req, res) => {
  try {
    const { name, email, password, whatsappPhone, dateOfBirth } = req.body;
    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password || !String(whatsappPhone || '').trim()) {
      return res.status(400).json({ error: 'Nome, email, WhatsApp e senha são obrigatórios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Este email já está cadastrado.' });
    }

    const normalizedWhatsapp = normalizeWhatsappPhone(whatsappPhone);
    if (!normalizedWhatsapp) {
      return res.status(400).json({ error: 'Informe um WhatsApp válido com DDD.' });
    }
    const normalizedDateOfBirth = normalizeDateOfBirth(dateOfBirth);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: 'CLIENT',
        whatsappPhone: normalizedWhatsapp,
        dateOfBirth: normalizedDateOfBirth,
        whatsappOptIn: Boolean(normalizedWhatsapp),
        whatsappUpdatedAt: normalizedWhatsapp ? new Date() : null,
      },
    });

    const token = generateToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Erro no registro:', error);
    if (error.message?.includes('WhatsApp') || error.message?.includes('nascimento')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Esta conta usa o login com Google. Por favor, entre com Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    const token = generateToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
};

export const googleCallback = (req, res) => {
  // req.user foi preenchido pelo passport após autenticação Google
  try {
    const token = generateToken(req.user);
    // Redireciona para o frontend com o token na query string
    res.redirect(`${getFrontendUrl()}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Erro no callback Google:', error);
    res.redirect(`${getFrontendUrl()}/login?error=google_failed`);
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await findPublicUser(req.user.id);

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno.' });
  }
};

export const updateWhatsapp = async (req, res) => {
  try {
    const normalizedWhatsapp = normalizeWhatsappPhone(req.body.whatsappPhone);
    const dataToUpdate = {
      whatsappPhone: normalizedWhatsapp,
      whatsappOptIn: true,
      whatsappUpdatedAt: new Date(),
    };

    if (req.body.dateOfBirth) {
      dataToUpdate.dateOfBirth = new Date(`${req.body.dateOfBirth}T12:00:00Z`);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
      select: userSelect,
    });

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar WhatsApp:', error);
    if (error.message?.includes('WhatsApp')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro interno ao atualizar WhatsApp.' });
  }
};
