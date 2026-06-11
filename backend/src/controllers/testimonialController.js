import prisma from '../config/prisma.js';

const normalizeRating = (value) => {
  const rating = Number.parseInt(value, 10);
  if (!Number.isFinite(rating)) return 5;
  return Math.min(5, Math.max(1, rating));
};

const parsePublished = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (value === 'false') return false;
  if (value === 'true') return true;
  return fallback;
};

export const getTestimonials = async (req, res) => {
  try {
    const includeHidden = req.user?.role === 'ADMIN' && req.query.all === 'true';
    const testimonials = await prisma.testimonial.findMany({
      where: includeHidden ? {} : { published: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(testimonials);
  } catch (error) {
    console.error('Erro ao buscar depoimentos:', error);
    res.status(500).json({ error: 'Erro ao buscar depoimentos.' });
  }
};

export const createTestimonial = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const text = String(req.body.text || '').trim();

    if (!name || !text) {
      return res.status(400).json({ error: 'Nome e depoimento sao obrigatorios.' });
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        text,
        rating: normalizeRating(req.body.rating),
        published: parsePublished(req.body.published, true),
      },
    });

    res.status(201).json(testimonial);
  } catch (error) {
    console.error('Erro ao criar depoimento:', error);
    res.status(500).json({ error: 'Erro ao criar depoimento.' });
  }
};

export const updateTestimonial = async (req, res) => {
  try {
    const data = {};

    if (req.body.name !== undefined) {
      data.name = String(req.body.name || '').trim();
      if (!data.name) return res.status(400).json({ error: 'Nome e obrigatorio.' });
    }

    if (req.body.text !== undefined) {
      data.text = String(req.body.text || '').trim();
      if (!data.text) return res.status(400).json({ error: 'Depoimento e obrigatorio.' });
    }

    if (req.body.rating !== undefined) data.rating = normalizeRating(req.body.rating);
    if (req.body.published !== undefined) data.published = parsePublished(req.body.published, true);

    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data,
    });

    res.json(testimonial);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Depoimento nao encontrado.' });
    }
    console.error('Erro ao atualizar depoimento:', error);
    res.status(500).json({ error: 'Erro ao atualizar depoimento.' });
  }
};

export const deleteTestimonial = async (req, res) => {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ message: 'Depoimento deletado com sucesso.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Depoimento nao encontrado.' });
    }
    console.error('Erro ao deletar depoimento:', error);
    res.status(500).json({ error: 'Erro ao deletar depoimento.' });
  }
};
