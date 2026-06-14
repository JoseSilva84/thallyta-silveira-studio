import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)[0];

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      whatsappPhone: user.whatsappPhone,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  whatsappPhone: true,
  whatsappOptIn: true,
  whatsappUpdatedAt: true,
  createdAt: true,
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

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl,
  whatsappPhone: user.whatsappPhone,
  whatsappOptIn: user.whatsappOptIn,
  whatsappUpdatedAt: user.whatsappUpdatedAt,
});

export const register = async (req, res) => {
  try {
    const { name, email, password, whatsappPhone } = req.body;
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
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: 'CLIENT',
        whatsappPhone: normalizedWhatsapp,
        whatsappOptIn: Boolean(normalizedWhatsapp),
        whatsappUpdatedAt: normalizedWhatsapp ? new Date() : null,
      },
    });

    const token = generateToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Erro no registro:', error);
    if (error.message?.includes('WhatsApp')) {
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: userSelect,
    });

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

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        whatsappPhone: normalizedWhatsapp,
        whatsappOptIn: true,
        whatsappUpdatedAt: new Date(),
      },
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
