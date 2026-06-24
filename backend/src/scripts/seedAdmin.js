/**
 * Script para criar o usuário Administrador no banco de dados.
 * Execute apenas UMA vez: npm run seed:admin
 *
 * Você pode passar email e senha como variáveis de ambiente:
 *   ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=suaSenha npm run seed:admin
 *
 * Ou o script usará os valores padrão abaixo (troque antes de rodar!).
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Thallyta Silveira';

async function main() {
  console.log('🔧 Criando usuário administrador...');

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ ERRO: Variáveis de ambiente ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórias.');
    console.log('Use o comando: ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=suaSenha npm run seed:admin');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`⚠️  Admin já existe com o email: ${ADMIN_EMAIL}`);
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { email: ADMIN_EMAIL }, data: { role: 'ADMIN' } });
      console.log('✅ Role atualizada para ADMIN.');
    }
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`✅ Admin criado com sucesso!`);
  console.log(`   Nome:  ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.role}`);
  console.log('');
  console.log('🔒 IMPORTANTE: Não compartilhe sua senha. Guarde em local seguro!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
