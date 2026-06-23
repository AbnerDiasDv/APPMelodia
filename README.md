# Harmonia

Aplicativo mobile para auxílio no aprendizado de instrumentos musicais
(violão, teclado, piano, flauta e bateria).

Trabalho final

Autor: Abner Dias

## Stack
- Frontend: React Native + Expo (Expo Router)
- Backend: FastAPI (Python)
- Banco de dados: MongoDB + SQLite local (cache offline)
- Autenticação: JWT (e-mail/senha) com bcrypt

## Funcionalidades
- Cadastro/login com dois perfis: Aluno e Superadmin
- Lições por instrumento + quiz interativo
- Afinador (microfone) e Metrônomo (40–240 BPM)
- Biblioteca de acordes com filtros
- Dashboard de progresso com gráficos
- Notificações locais (lembrete diário)
- Foto de perfil via câmera/galeria
- Painel Superadmin: gestão de usuários + dashboard global

## Como rodar localmente

### Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001

### Frontend
cd frontend
yarn install
npx expo start


### Credenciais de teste (Superadmin)
- E-mail: `admin@harmonia.app`
- Senha: `Admin@123`
