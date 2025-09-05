# Setup Completo do Sistema KG do Amor
# Congregação O Alvo Curitiba

echo "🚀 Iniciando setup do Sistema KG do Amor..."

# 1. Criar estrutura de diretórios
mkdir -p sistema-kg-amor/{backend,frontend,database}
cd sistema-kg-amor

echo "📁 Estrutura de diretórios criada"

# 2. Setup do Banco PostgreSQL
echo "🗄️ Configurando PostgreSQL..."

# Script SQL para criar banco
cat > database/setup.sql << 'EOF'
-- Criar banco de dados
CREATE DATABASE sistema_kg_amor;

-- Conectar ao banco
\c sistema_kg_amor;

-- Executar o schema (copiar o conteúdo do schema-postgresql.sql aqui)
-- Ver artefato schema-postgresql para o conteúdo completo
EOF

echo "✅ Scripts do banco criados"

# 3. Setup do Backend
echo "⚙️ Configurando Backend..."

cd backend
npm init -y

# Instalar dependências
npm install express prisma @prisma/client cors helmet bcryptjs jsonwebtoken joi winston dotenv compression rate-limiter-flexible

# Instalar dependências de desenvolvimento
npm install -D nodemon

# Criar estrutura do backend
mkdir -p src/{routes,middlewares,services,utils} logs prisma

# Criar package.json configurado
cat > package.json << 'EOF'
{
  "name": "sistema-kg-amor-backend",
  "version": "1.0.0",
  "description": "Backend do Sistema KG do Amor - Congregação O Alvo Curitiba",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:deploy": "prisma migrate deploy",
    "seed": "node prisma/seed.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "joi": "^17.9.0",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "compression": "^1.7.4",
    "rate-limiter-flexible": "^2.4.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  },
  "keywords": ["sistema", "doacao", "igreja", "estoque"],
  "author": "Congregação O Alvo Curitiba",
  "license": "MIT"
}
EOF

# Criar arquivo .env
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/sistema_kg_amor?schema=public"

# JWT
JWT_SECRET="sua-chave-super-secreta-jwt-aqui-mude-em-producao"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Logs
LOG_LEVEL="info"
EOF

# Criar arquivo de seed
cat > prisma/seed.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

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

  console.log('👤 Usuário admin criado:', admin.email);

  // Criar algumas células de exemplo
  const redeVermelha = await prisma.redes.upsert({
    where: { cor: 'Vermelha' },
    update: {},
    create: {
      cor: 'Vermelha',
      descricao: 'Rede de células da zona norte'
    }
  });

  const supervisaoNorte = await prisma.supervisoes.upsert({
    where: { nome: 'Supervisão Norte' },
    update: {},
    create: {
      nome: 'Supervisão Norte',
      responsavel: 'Pastor João Silva'
    }
  });

  const celulaAlpha = await prisma.celulas.upsert({
    where: { nome: 'Célula Alpha' },
    update: {},
    create: {
      nome: 'Célula Alpha',
      rede_id: redeVermelha.id,
      supervisao_id: supervisaoNorte.id,
      lideres: 'Maria e João Santos',
      endereco: 'Rua das Flores, 123 - Curitiba/PR',
      telefone: '(41) 99999-0001'
    }
  });

  console.log('🏠 Célula criada:', celulaAlpha.nome);

  // Criar categorias de produtos
  const categoriaGraos = await prisma.categorias.upsert({
    where: { nome: 'GRÃOS E CEREAIS' },
    update: {},
    create: {
      nome: 'GRÃOS E CEREAIS',
      descricao: 'Feijões, arroz, lentilhas e similares',
      cor: '#8B4513'
    }
  });

  // Criar alguns produtos
  const feijaoPreto = await prisma.produtos.create({
    data: {
      nome: 'Feijão Preto',
      categoria_id: categoriaGraos.id,
      unidade_medida: 'kg',
      descricao: 'Feijão preto tipo 1'
    }
  });

  console.log('🥫 Produto criado:', feijaoPreto.nome);

  console.log('✅ Seed completado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

cd ..

echo "✅ Backend configurado"

# 4. Setup do Frontend
echo "🎨 Configurando Frontend..."

cd frontend
npx create-react-app . --template typescript
npm install axios @tanstack/react-query react-router-dom react-hook-form @hookform/resolvers yup react-hot-toast date-fns lucide-react recharts

# Instalar e configurar TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Configurar TailwindCSS
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
EOF

# Adicionar TailwindCSS ao CSS principal
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
EOF

# Criar estrutura do frontend
mkdir -p src/{components,pages,services,hooks,utils,contexts}

cd ..

echo "✅ Frontend configurado"

# 5. Criar Docker Compose para desenvolvimento
echo "🐳 Configurando Docker..."

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: kg-amor-postgres
    environment:
      POSTGRES_DB: sistema_kg_amor
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/setup.sql:/docker-entrypoint-initdb.d/setup.sql
    networks:
      - kg-amor-network

  redis:
    image: redis:7-alpine
    container_name: kg-amor-redis
    ports:
      - "6379:6379"
    networks:
      - kg-amor-network

  backend:
    build: ./backend
    container_name: kg-amor-backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/sistema_kg_amor?schema=public
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - kg-amor-network

  frontend:
    build: ./frontend
    container_name: kg-amor-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000/api
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - kg-amor-network

volumes:
  postgres_data:

networks:
  kg-amor-network:
    driver: bridge
EOF

# Criar Dockerfiles
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
EOF

cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF

echo "✅ Docker configurado"

# 6. Criar scripts de desenvolvimento
cat > scripts/dev-setup.sh << 'EOF'
#!/bin/bash

echo "🚀 Configurando ambiente de desenvolvimento..."

# Verificar se PostgreSQL está rodando
if ! nc -z localhost 5432; then
  echo "📦 Iniciando PostgreSQL com Docker..."
  docker-compose up -d postgres
  echo "⏳ Aguardando PostgreSQL inicializar..."
  sleep 10
fi

# Setup do backend
echo "⚙️ Configurando backend..."
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run seed

echo "🎨 Configurando frontend..."
cd ../frontend
npm install

echo "✅ Setup completo! Use os comandos:"
echo "  Backend: cd backend && npm run dev"
echo "  Frontend: cd frontend && npm start"
EOF

cat > scripts/deploy.sh << 'EOF'
#!/bin/bash

echo "🚢 Iniciando deploy de produção..."

# Build do frontend
echo "📦 Building frontend..."
cd frontend
npm run build

# Deploy do backend
echo "🚀 Deploying backend..."
cd ../backend
npx prisma migrate deploy
npx prisma generate

# Restart services
echo "🔄 Restarting services..."
pm2 restart sistema-kg-amor-backend

echo "✅ Deploy concluído!"
EOF

chmod +x scripts/*.sh

echo "✅ Scripts criados"

# 7. Criar documentação
cat > README.md << 'EOF'
# Sistema KG do Amor 💝

Sistema de controle de doações da **Congregação O Alvo Curitiba**.

## 🚀 Funcionalidades

### 📥 Recebimento de Doações
- Cadastro rápido de entregas das células
- Controle de lideranças e supervisões
- Histórico completo de recebimentos

### 📦 Controle de Estoque
- Gestão detalhada por categorias
- Controle de validade e lotes
- Alertas automáticos
- Botões de ajuste rápido (+/-)

### 📊 Relatórios e Dashboard
- Métricas em tempo real
- Rankings de células
- Análises por rede
- Exportação para Excel

### 👥 Gestão de Células
- Cadastro completo (Nome, Rede, Líderes, Supervisão)
- Edição de informações
- Histórico de entregas

## 🛠️ Tecnologias

### Backend
- **Node.js** + Express
- **PostgreSQL** + Prisma ORM
- **JWT** para autenticação
- **Winston** para logs
- **Docker** para containerização

### Frontend
- **React** + TypeScript
- **TailwindCSS** para UI
- **React Query** para estado
- **React Hook Form** para formulários
- **Recharts** para gráficos

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 15+
- Docker (opcional)

### Setup Rápido

```bash
# 1. Clonar o repositório
git clone <repositorio>
cd sistema-kg-amor

# 2. Executar setup automático
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# 3. Iniciar desenvolvimento
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm start
```

### Com Docker

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/sistema_kg_amor"

# JWT
JWT_SECRET="sua-chave-secreta-aqui"

# Server
PORT=5000
NODE_ENV="development"
```

## 📚 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Perfil do usuário

### Células
- `GET /api/celulas` - Listar células
- `POST /api/celulas` - Criar célula
- `PUT /api/celulas/:id` - Atualizar célula

### Recebimentos  
- `GET /api/recebimentos` - Listar recebimentos
- `POST /api/recebimentos` - Criar recebimento
- `GET /api/recebimentos/dashboard` - Dashboard

### Estoque
- `GET /api/estoque` - Listar estoque
- `POST /api/estoque` - Adicionar item
- `GET /api/estoque/resumo` - Resumo por categoria
- `GET /api/estoque/alertas` - Alertas de validade

### Relatórios
- `GET /api/relatorios/arrecadacao` - Relatório de arrecadação
- `GET /api/relatorios/estoque` - Relatório de estoque

## 🚀 Deploy

### Desenvolvimento
```bash
./scripts/dev-setup.sh
```

### Produção
```bash
./scripts/deploy.sh
```

## 📋 Estrutura do Banco

```sql
-- Principais tabelas
- redes (cores das redes)
- supervisoes 
- celulas
- categorias (produtos)
- produtos
- usuarios
- recebimentos
- estoque_itens
- movimentacoes_estoque
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou suporte:
- **Email**: ti@oalvocuritiba.com
- **WhatsApp**: (41) 99999-9999

## 📄 Licença

Este projeto é licenciado sob a MIT License.

---

**Desenvolvido com ❤️ para a Congregação O Alvo Curitiba**
EOF

# Criar arquivo de ambiente de exemplo
cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sistema_kg_amor?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF

echo "📚 Documentação criada"

# 8. Finalizar setup
echo ""
echo "🎉 SETUP COMPLETO!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o PostgreSQL (ou use Docker)"
echo "2. Execute: ./scripts/dev-setup.sh"
echo "3. Inicie o backend: cd backend && npm run dev"
echo "4. Inicie o frontend: cd frontend && npm start"
echo ""
echo "🌐 URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend: http://localhost:5000"
echo "- Prisma Studio: npx prisma studio"
echo ""
echo "👤 Login padrão:"
echo "- Email: admin@oalvocuritiba.com"
echo "- Senha: admin123"
echo ""
echo "📖 Documentação completa no README.md"
echo ""
echo "🙏 Sistema KG do Amor - Congregação O Alvo Curitiba"