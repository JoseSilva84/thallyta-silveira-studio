import {
  listClientBirthdays,
  listMonthlyBirthdayRewards,
  sendManualBirthdayReward,
  updateClientDateOfBirth,
} from '../services/birthdayRewardService.js';

export const listBirthdayClients = async (req, res) => {
  try {
    const clients = await listClientBirthdays();
    res.json({ clients });
  } catch (error) {
    console.error('Erro ao buscar datas de nascimento dos clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar datas de nascimento dos clientes.' });
  }
};

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

export const updateBirthdayClientDate = async (req, res) => {
  try {
    const user = await updateClientDateOfBirth(req.params.userId, req.body?.dateOfBirth);

    res.json({
      message: user.dateOfBirth ? 'Data de nascimento salva.' : 'Data de nascimento marcada como nao informada.',
      user,
    });
  } catch (error) {
    console.error('Erro ao atualizar data de nascimento do cliente:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Erro ao atualizar data de nascimento do cliente.',
    });
  }
};
