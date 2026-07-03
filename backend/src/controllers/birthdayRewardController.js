import {
  listMonthlyBirthdayRewards,
  sendManualBirthdayReward,
} from '../services/birthdayRewardService.js';

export const listMonthlyBirthdays = async (req, res) => {
  try {
    const result = await listMonthlyBirthdayRewards({
      year: req.query.year,
      month: req.query.month,
    });

    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar aniversariantes do mes:', error);
    res.status(500).json({ error: 'Erro ao buscar aniversariantes do mes.' });
  }
};

export const sendBirthdayMessage = async (req, res) => {
  try {
    const result = await sendManualBirthdayReward(req.params.userId, {
      year: req.body?.year,
    });

    res.json({
      message: 'Mensagem de aniversario enviada.',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        whatsappPhone: result.user.whatsappPhone,
        dateOfBirth: result.user.dateOfBirth,
      },
      reward: result.reward,
    });
  } catch (error) {
    console.error('Erro ao enviar aniversario manual:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Erro ao enviar mensagem de aniversario.',
    });
  }
};
