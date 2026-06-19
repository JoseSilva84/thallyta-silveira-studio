import prisma from '../config/prisma.js';

const normalizeExpensePayload = (body) => {
  const description = String(body.description || '').trim();
  const category = String(body.category || 'Salao').trim() || 'Salao';
  const amount = Number(String(body.amount ?? '').replace(',', '.'));
  const dateValue = body.date ? new Date(body.date) : new Date();
  const notes = String(body.notes || '').trim();

  if (!description) {
    return { error: 'Descrição da despesa e obrigatoria.' };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Valor da despesa invalido.' };
  }

  if (Number.isNaN(dateValue.getTime())) {
    return { error: 'Data da despesa invalida.' };
  }

  return {
    data: {
      description,
      category,
      amount,
      date: dateValue,
      notes: notes || null,
    },
  };
};

export const listFinanceExpenses = async (_req, res) => {
  try {
    const expenses = await prisma.financeExpense.findMany({
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(expenses);
  } catch (error) {
    console.error('Erro ao buscar despesas financeiras:', error);
    res.status(500).json({ error: 'Erro ao buscar despesas financeiras.' });
  }
};

export const createFinanceExpense = async (req, res) => {
  const payload = normalizeExpensePayload(req.body);

  if (payload.error) {
    return res.status(400).json({ error: payload.error });
  }

  try {
    const expense = await prisma.financeExpense.create({
      data: {
        ...payload.data,
        createdById: req.user?.id || null,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Erro ao criar despesa financeira:', error);
    res.status(500).json({ error: 'Erro ao criar despesa financeira.' });
  }
};

export const deleteFinanceExpense = async (req, res) => {
  try {
    await prisma.financeExpense.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Despesa nao encontrada.' });
    }

    console.error('Erro ao remover despesa financeira:', error);
    res.status(500).json({ error: 'Erro ao remover despesa financeira.' });
  }
};
