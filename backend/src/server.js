const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { PrismaClient } = require('@prisma/client');
const winston = require('winston');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middlewares globais
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging de requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

// ===== ROTAS DE AUTENTICAÇÃO =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');

    const usuario = await prisma.usuarios.findUnique({
      where: { email, ativo: true }
    });

    if (!usuario || !await bcrypt.compare(senha, usuario.senha_hash)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { userId: usuario.id, papel: usuario.papel },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel
      }
    });
  } catch (error) {
    logger.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.usuarios.findUnique({
      where: { id: decoded.userId, ativo: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// ===== ROTAS PROTEGIDAS =====

// Rota protegida de teste
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Acesso autorizado!', user: req.user.nome });
});

// ===== ROTAS DE REDES =====
app.get('/api/redes', authenticateToken, async (req, res) => {
  try {
    const redes = await prisma.redes.findMany({
      where: { ativo: true },
      include: {
        celulas: {
          where: { ativo: true }
        }
      }
    });
    res.json(redes);
  } catch (error) {
    logger.error('Erro ao buscar redes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/redes', authenticateToken, async (req, res) => {
  try {
    const { cor, descricao } = req.body;
    
    const rede = await prisma.redes.create({
      data: { cor, descricao }
    });
    
    res.status(201).json(rede);
  } catch (error) {
    logger.error('Erro ao criar rede:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE CÉLULAS =====
app.get('/api/celulas', authenticateToken, async (req, res) => {
  try {
    const celulas = await prisma.celulas.findMany({
      where: { ativo: true },
      include: {
        rede: true
      }
    });
    res.json(celulas);
  } catch (error) {
    logger.error('Erro ao buscar células:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/celulas', authenticateToken, async (req, res) => {
  try {
    const { nome, lider, telefone, endereco, rede_id } = req.body;
    
    const celula = await prisma.celulas.create({
      data: {
        nome,
        lider,
        telefone,
        endereco,
        rede_id: parseInt(rede_id)
      },
      include: {
        rede: true
      }
    });
    
    res.status(201).json(celula);
  } catch (error) {
    logger.error('Erro ao criar célula:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Após a rota POST /api/celulas, adicione:

// Atualizar célula
app.put('/api/celulas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, lider, telefone, endereco, rede_id } = req.body;
    
    const celula = await prisma.celulas.update({
      where: { id: parseInt(id) },
      data: {
        nome,
        lider,
        telefone,
        endereco,
        rede_id: parseInt(rede_id)
      },
      include: {
        rede: true
      }
    });
    
    res.json(celula);
  } catch (error) {
    logger.error('Erro ao atualizar célula:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir célula
app.delete('/api/celulas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.celulas.update({
      where: { id: parseInt(id) },
      data: { ativo: false }
    });
    
    res.json({ message: 'Célula excluída com sucesso' });
  } catch (error) {
    logger.error('Erro ao excluir célula:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE PRODUTOS =====
app.get('/api/produtos', authenticateToken, async (req, res) => {
  try {
    const produtos = await prisma.produtos.findMany({
      where: { ativo: true },
      include: {
        categoria: true
      }
    });
    res.json(produtos);
  } catch (error) {
    logger.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE CATEGORIAS =====
app.get('/api/categorias', authenticateToken, async (req, res) => {
  try {
    const categorias = await prisma.categorias.findMany({
      where: { ativo: true }
    });
    res.json(categorias);
  } catch (error) {
    logger.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE RECEBIMENTOS =====
app.get('/api/recebimentos', authenticateToken, async (req, res) => {
  try {
    const recebimentos = await prisma.recebimentos.findMany({
      include: {
        celula: {
          include: { rede: true }
        },
        produto: {
          include: { categoria: true }
        }
      },
      orderBy: {
        data_chegada: 'desc'
      }
    });
    res.json(recebimentos);
  } catch (error) {
    logger.error('Erro ao buscar recebimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/recebimentos', authenticateToken, async (req, res) => {
  try {
    const { celula_id, produto_id, quantidade, observacoes } = req.body;
    
    const recebimento = await prisma.recebimentos.create({
      data: {
        celula_id: parseInt(celula_id),
        produto_id: parseInt(produto_id),
        quantidade: parseFloat(quantidade),
        observacoes
      },
      include: {
        celula: {
          include: { rede: true }
        },
        produto: {
          include: { categoria: true }
        }
      }
    });

    // Atualizar estoque
    const estoqueExistente = await prisma.estoque.findUnique({
      where: { produto_id: parseInt(produto_id) }
    });

    if (estoqueExistente) {
      await prisma.estoque.update({
        where: { produto_id: parseInt(produto_id) },
        data: {
          quantidade_atual: estoqueExistente.quantidade_atual + parseFloat(quantidade)
        }
      });
    } else {
      await prisma.estoque.create({
        data: {
          produto_id: parseInt(produto_id),
          quantidade_atual: parseFloat(quantidade)
        }
      });
    }
    
    res.status(201).json(recebimento);
  } catch (error) {
    logger.error('Erro ao criar recebimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE ESTOQUE =====
app.get('/api/estoque', authenticateToken, async (req, res) => {
  try {
    const estoque = await prisma.estoque.findMany({
      include: {
        produto: {
          include: { categoria: true }
        }
      }
    });
    res.json(estoque);
  } catch (error) {
    logger.error('Erro ao buscar estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE RELATÓRIOS =====
app.get('/api/relatorios/dashboard', authenticateToken, async (req, res) => {
  try {
    const [
      totalCelulas,
      totalRecebimentos,
      totalProdutos,
      recebimentosRecentes
    ] = await Promise.all([
      prisma.celulas.count({ where: { ativo: true } }),
      prisma.recebimentos.count(),
      prisma.produtos.count({ where: { ativo: true } }),
      prisma.recebimentos.findMany({
        take: 5,
        orderBy: { data_chegada: 'desc' },
        include: {
          celula: { include: { rede: true } },
          produto: { include: { categoria: true } }
        }
      })
    ]);

    res.json({
      totalCelulas,
      totalRecebimentos,
      totalProdutos,
      recebimentosRecentes
    });
  } catch (error) {
    logger.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Tratamento de rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido. Fechando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});