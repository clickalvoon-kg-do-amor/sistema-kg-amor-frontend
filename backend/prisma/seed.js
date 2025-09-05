const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Criar usuário admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.usuarios.upsert({
    where: { email: 'admin@oalvocuritiba.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@oalvocuritiba.com',
      senha_hash: hashedPassword,
      papel: 'ADMIN',
      ativo: true
    }
  });

  console.log('Usuário admin criado:', admin.email);

  // Criar todas as redes com cores
  const redes = [
    { cor: 'Amarela', descricao: 'Rede de células amarela' },
    { cor: 'Azul', descricao: 'Rede de células azul' },
    { cor: 'Branca', descricao: 'Rede de células branca' },
    { cor: 'Vermelha', descricao: 'Rede de células vermelha' },
    { cor: 'Verde', descricao: 'Rede de células verde' }
  ];

  for (const redeData of redes) {
    await prisma.redes.upsert({
      where: { cor: redeData.cor },
      update: {},
      create: redeData
    });
    console.log('Rede criada:', redeData.cor);
  }

  // Criar categoria de produtos
  const categoriaGraos = await prisma.categorias.upsert({
    where: { nome: 'GRÃOS E CEREAIS' },
    update: {},
    create: {
      nome: 'GRÃOS E CEREAIS',
      descricao: 'Feijões, arroz, lentilhas e similares',
      cor: '#8B4513'
    }
  });

  console.log('Categoria criada:', categoriaGraos.nome);

  console.log('Seed completado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });