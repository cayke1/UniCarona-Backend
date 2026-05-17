# Unicarona Backend

Backend em Node.js com TypeScript, Express, Prisma ORM e PostgreSQL via Docker Compose.

## Tecnologias

- Node.js + TypeScript
- Express 5
- Prisma ORM + PostgreSQL
- Zod (validação de schemas)
- JWT (autenticação via access + refresh token)
- bcrypt (hash de senhas)
- Docker Compose

## Como rodar

### Com Docker (recomendado)

```bash
docker compose up
```

A API ficará disponível em `http://localhost:3000`.

Para derrubar o ambiente:

```bash
docker compose down
```

Para remover também o volume do banco:

```bash
docker compose down -v
```

### Localmente sem Docker

```bash
npm install
cp .env.example .env     # Windows: Copy-Item .env.example .env
npm run prisma:generate
npm run db:push
npm run dev
```

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia em desenvolvimento com reload automático |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa build de produção |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate:deploy` | Aplica migrations existentes |
| `npm run db:push` | Sincroniza schema com o banco (dev) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Variáveis de ambiente

Veja `.env.example` para a lista completa. Variáveis obrigatórias:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unicarona
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## API Endpoints

Base URL: `http://localhost:3000/api`

Rotas protegidas exigem header `Authorization: Bearer <accessToken>`.

---

### Autenticação — `/auth`

#### `POST /auth/register`
Cria uma nova conta.

**Body:**
```json
{ "name": "João", "email": "joao@uni.br", "password": "senha123" }
```

**Resposta 201:**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "...", "name": "João", "email": "joao@uni.br", "roles": [], "photoUrl": null, "createdAt": "..." }
}
```

**Erros:** `400` validação | `409` e-mail já cadastrado

---

#### `POST /auth/login`
Autentica um usuário existente.

**Body:**
```json
{ "email": "joao@uni.br", "password": "senha123" }
```

**Resposta 200:** mesmo formato de `/register`

**Erros:** `400` validação | `401` credenciais inválidas

---

#### `POST /auth/refresh`
Renova o par de tokens.

**Body:** `{ "refreshToken": "..." }`

**Resposta 200:** mesmo formato de `/register`

**Erros:** `401` token inválido ou expirado

---

#### `POST /auth/logout`
Invalida o refresh token no banco.

**Body:** `{ "refreshToken": "..." }`

**Resposta:** `204 No Content`

---

#### `POST /auth/forgot-password`
Envia e-mail de recuperação de senha (falha silenciosa para e-mails não cadastrados).

**Body:** `{ "email": "joao@uni.br" }`

**Resposta 200:** `{ "message": "..." }`

---

#### `POST /auth/reset-password`
Redefine a senha com o token recebido por e-mail.

**Body:** `{ "token": "...", "newPassword": "novaSenha123" }`

**Resposta:** `204 No Content`

**Erros:** `400` token inválido ou expirado

---

### Usuários — `/users`

#### `GET /users/me` 🔒
Retorna o perfil do usuário autenticado.

**Resposta 200:**
```json
{ "id": "...", "name": "João", "email": "joao@uni.br", "roles": ["DRIVER"], "pixKey": "joao@pix.br", "balance": 0, "photoUrl": null }
```

---

#### `PUT /users/me` 🔒
Atualiza nome ou chave PIX do usuário.

**Body:** `{ "name": "João Silva", "pixKey": "joao@pix.br" }` (campos opcionais)

**Resposta 200:** perfil atualizado

---

#### `POST /users/me/role` 🔒
Promove o usuário a motorista. Requer chave PIX cadastrada (no body ou previamente salvo no perfil).

**Body:** `{ "pixKey": "joao@pix.br" }` (opcional se já cadastrado)

**Resposta 200:** perfil atualizado com `roles: ["DRIVER"]`

**Erros:** `400` sem chave PIX

---

#### `GET /users/me/requests` 🔒
Lista as solicitações de carona do passageiro autenticado. Equivalente a `GET /requests/me`.

---

### Caronas — `/rides`

#### `POST /rides` 🔒 (DRIVER)
Publica uma nova carona.

**Body:**
```json
{
  "departureTime": "2025-06-01T08:00:00Z",
  "originAddress": "Campus A",
  "originLat": -23.5, "originLng": -46.6,
  "destinationAddress": "Campus B",
  "destinationLat": -23.6, "destinationLng": -46.7,
  "totalSeats": 3
}
```

Campos opcionais: `costPerKm`, `distanceKm`, `estimatedTotalCost`, `costPerSeat` (calculados automaticamente pelo servidor se omitidos).

**Resposta 201:** objeto completo da carona incluindo `costPerSeat`, `distanceKm`, `acceptingRequests: true`, `driver`.

**Erros:** `400` validação | `400` motorista já tem carona ativa | `403` sem role DRIVER

---

#### `GET /rides` 🔒
Lista caronas ativas disponíveis (exclui as do próprio usuário).

**Query:** `?lat=-23.5&lng=-46.6` (ordena por proximidade quando fornecido)

**Resposta 200:** array de caronas com `id`, `originLat/Lng`, `destinationLat/Lng`, `departureTime`, `availableSeats`, `costPerSeat`, `distanceKm`, `driver.name`.

---

#### `GET /rides/me` 🔒
Lista as caronas ativas do motorista autenticado, com solicitações pendentes.

**Resposta 200:** array de `{ id, originAddress, destinationAddress, departureTime, availableSeats, totalSeats, acceptingRequests, pendingRequests[] }`

---

#### `GET /rides/me/history` 🔒
Lista caronas concluídas do motorista.

**Resposta 200:** array de `{ id, originAddress, destinationAddress, departureTime, totalSeats, paidPassengers }`

---

#### `GET /rides/:id` 🔒
Retorna detalhes de uma carona. Passageiros só veem caronas ativas e não partidas.

**Resposta 200:** objeto completo com `driver`, `requests[]` (exceto REJECTED/CANCELLED).

**Erros:** `404` não encontrada | `400` UUID inválido

---

#### `PATCH /rides/:id` 🔒 (DRIVER)
Atualiza estado da carona (abrir/fechar solicitações ou status).

**Body:** `{ "acceptingRequests": true }` ou `{ "bookingOpen": true }` (aliases equivalentes) e/ou `{ "status": "ACTIVE" | "CANCELLED" | "COMPLETED" }`

**Resposta 200:** objeto completo da carona atualizada.

---

#### `DELETE /rides/:id` 🔒 (DRIVER)
Cancela a carona e todas as solicitações pendentes/aceitas.

**Resposta 200:** objeto da carona cancelada.

---

#### `POST /rides/:id/complete` 🔒 (DRIVER)
Encerra a carona como concluída. Só é possível após o horário de partida.

**Resposta 200:** `{ "message": "Ride completed successfully" }`

---

#### `GET /rides/:id/poll` 🔒
Long-poll — aguarda até 30s por mudanças na carona. Retorna `304` se não houver mudanças.

---

#### `POST /rides/:id/requests` 🔒
Passageiro solicita entrada em uma carona.

**Body:** `{ "pickupLocation": "Bloco A", "dropoffLocation": "Terminal", "requestedSeats": 1 }`

**Resposta 201:** objeto da solicitação com `estimatedCost`, `appFee`, `totalCharged`, `status: "PENDING"`.

**Erros:** `400` carona não ativa | `400` sem vagas | `400` já solicitou | `400` partida no passado

---

#### `GET /rides/:id/requests` 🔒 (DRIVER)
Lista todas as solicitações de uma carona do motorista.

---

### Solicitações — `/requests`

#### `GET /requests/me` 🔒
Lista as solicitações do passageiro autenticado (com dados da carona e motorista).

---

#### `GET /requests/:id` 🔒
Retorna uma solicitação específica. Acessível apenas pelo passageiro ou motorista envolvido.

---

#### `PATCH /requests/:id` 🔒
Atualiza o status de uma solicitação.

**Body:** `{ "status": "ACCEPTED" | "REJECTED" | "CANCELLED" }`

| Quem | Status permitido | Pré-condição |
|------|-----------------|--------------|
| Motorista | `ACCEPTED` | request.status = `PENDING` |
| Motorista | `REJECTED` | request.status = `PENDING` |
| Passageiro | `CANCELLED` | request.status = `PENDING` |

Ao aceitar (`ACCEPTED`): backend avança internamente para `AWAITING_PAYMENT` e decrementa vagas disponíveis.

**Resposta 200:** objeto da solicitação atualizada.

**Erros:** `400` transição inválida | `403` não autorizado | `404` não encontrada

---

### Pagamentos — `/payments`

#### `POST /payments/mock` 🔒
Processa o pagamento mockado de uma solicitação em status `AWAITING_PAYMENT`.

**Body:** `{ "requestId": "uuid" }`

Simula ~1.5s de processamento.

**Resposta 200:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "request": { "...campos...", "status": "PAID" },
  "transaction": { "id": "...", "type": "CREDIT", "paymentMethod": "PIX", "status": "CONFIRMED", "amount": 12.50 },
  "driverBalance": 12.50
}
```

**Erros:** `400` status inválido | `400` já pago | `403` não é o passageiro | `404` solicitação não encontrada

---

### Health Check

#### `GET /api/health`
Verifica disponibilidade da API e conectividade com o banco.

---

## Fluxo principal da demo

```
1. POST /auth/register           → cria conta
2. POST /auth/login              → autentica
3. POST /users/me/role           → vira motorista (com pixKey)
4. POST /rides                   → publica carona
5. PATCH /rides/:id              → abre/fecha vagas  { bookingOpen: true/false }
6. POST /rides/:id/requests      → passageiro solicita vaga
7. PATCH /requests/:id           → motorista aceita  { status: "ACCEPTED" }
                                    → status vai para AWAITING_PAYMENT automaticamente
8. POST /payments/mock           → passageiro paga   { requestId }
                                    → status vai para PAID, saldo do motorista incrementado
9. POST /rides/:id/complete      → motorista encerra a viagem
```

## Banco de Dados

**Entidades principais:**
- `User` — motoristas e passageiros, saldos e chaves PIX
- `Ride` — caronas, trajetos, assentos, custos
- `RideRequest` — solicitações com máquina de estados: `PENDING → AWAITING_PAYMENT → PAID`
- `Transaction` — registro de créditos ao motorista
- `RefreshToken` — tokens de renovação de sessão
- `PasswordResetToken` — tokens de redefinição de senha

**Comandos úteis:**
```bash
npx prisma studio          # Interface visual dos dados
npx prisma migrate dev     # Gera e aplica migrations
npx prisma db seed         # Popula dados iniciais
```
