# Unicarona Backend

Backend base em Node.js com TypeScript, Express, Prisma ORM e PostgreSQL via Docker Compose.

## Tecnologias utilizadas

- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Docker Compose
- ESLint
- Prettier
- dotenv

## Como rodar o ambiente completo com Docker

1. Suba a API e o banco com um unico comando:

```bash
docker compose up
```

2. A API ficara disponivel em `http://localhost:3000`.

3. O PostgreSQL ficara disponivel em `localhost:5432` com os valores padrao:

- database: `unicarona`
- user: `postgres`
- password: `postgres`

4. Para derrubar o ambiente:

```bash
docker compose down
```

Se quiser remover tambem o volume do banco, use `docker compose down -v`.

## Como rodar localmente sem Docker

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo de ambiente a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell, voce pode usar:

```powershell
Copy-Item .env.example .env
```

3. Garanta que exista um PostgreSQL acessivel pela `DATABASE_URL` do `.env`.

4. Gere o client do Prisma:

```bash
npm run prisma:generate
```

5. Sincronize o schema com o banco:

```bash
npm run db:push
```

6. Rode o projeto em desenvolvimento:

```bash
npm run dev
```

## Scripts disponiveis

- `npm run dev`: inicia o servidor em modo desenvolvimento com recarga automatica.
- `npm run build`: compila o projeto TypeScript para a pasta `dist/`.
- `npm start`: executa a aplicacao compilada em ambiente de producao.
- `npm run prisma:generate`: gera o Prisma Client.
- `npm run prisma:migrate:deploy`: aplica migrations existentes com Prisma.
- `npm run db:push`: sincroniza o schema atual do Prisma com o banco.
- `npm run lint`: analisa o codigo com ESLint.
- `npm run format`: formata os arquivos com Prettier.

## Banco de Dados (Prisma)

O projeto utiliza **Prisma ORM** com **PostgreSQL**.

### Entidades Principais

- **User**: Gerenciamento de motoristas e passageiros, saldos e chaves PIX.
- **Ride**: Cadastro de caronas, trajetos, assentos e custos.
- **RideRequest**: Solicitações de passageiros para caronas específicas.
- **Transaction**: Registro de transações financeiras (pagamentos, estornos, saques).

### Comandos Úteis

- `npx prisma migrate dev`: gera e aplica migrações ao banco de dados.
- `npx prisma generate`: gera o Prisma Client para uso no código.
- `npx prisma db seed`: popula o banco com dados iniciais para desenvolvimento.
- `npx prisma studio`: abre uma interface visual para explorar os dados.

## Escalabilidade e manutencao

O projeto utiliza `dotenv` para carregar configuracoes locais a partir do arquivo `.env`.

- `.env.example` documenta as variaveis esperadas.
- `.env` esta ignorado no versionamento por seguranca.
- `DATABASE_URL` define a conexao do Prisma com o PostgreSQL.

## Google Maps API (T12)

O servico de distancia utiliza a Google Maps Distance Matrix API para calculos precisos.

### Configuracao

1. Obtenha uma chave de API no [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Habilite a API "Distance Matrix API" para sua chave
3. Adicione a chave ao arquivo `.env`:

```env
GOOGLE_MAPS_API_KEY=sua_chave_aqui
```

### Cache

Os resultados sao cacheados por 1 hora (3600s) usando `node-cache` para reduzir chamadas e custos.

### Fallback

Se a chave nao estiver configurada ou a API falhar, o sistema utiliza a formula Haversine para calculo de distancia.

## Servico de Precificacao (T13)

O pricing service calcula custos de viagem com base em distancia e configuracoes ambientais.

### Variaveis de Configuracao

```env
PRICING_BASE_RATE=3.00       # Taxa fixa por viagem (R$)
PRICING_PER_KM=0.50          # Custo por quilometro (R$)
PRICING_APP_FEE_PERCENT=10   # Taxa da aplicacao (%)
```

### Calculos

- **Custo Total**: `BASE_RATE + (DISTANCE_KM * PER_KM)`
- **Taxa App**: `TOTAL_COST * APP_FEE_PERCENT / 100`
- **Custo por Assento**: `TOTAL_COST / AVAILABLE_SEATS`

## Health check

A rota `GET /api/health` agora valida tambem a conectividade com o banco e retorna o status da API com o campo `database`.
