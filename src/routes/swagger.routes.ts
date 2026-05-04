/**
 * @swagger
 * /api/rides:
 *   get:
 *     summary: Listar caronas ativas
 *     description: Retorna lista de caronas ativas ordenadas por proximidade do usuário (se lat/lng fornecidos) ou por horário de partida
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude do usuário para ordenação por distância
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude do usuário para ordenação por distância
 *     responses:
 *       200:
 *         description: Lista de caronas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Criar uma nova carona
 *     description: Cria uma carona com cálculo automático de distância via Google Maps e custo por assento
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - departureTime
 *               - originAddress
 *               - originLat
 *               - originLng
 *               - destinationAddress
 *               - destinationLat
 *               - destinationLng
 *               - totalSeats
 *             properties:
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 description: Data e hora de partida (deve ser pelo menos 15min no futuro)
 *               originAddress:
 *                 type: string
 *                 description: Endereço de origem
 *               originLat:
 *                 type: number
 *                 description: Latitude de origem
 *               originLng:
 *                 type: number
 *                 description: Longitude de origem
 *               destinationAddress:
 *                 type: string
 *                 description: Endereço de destino
 *               destinationLat:
 *                 type: number
 *                 description: Latitude de destino
 *               destinationLng:
 *                 type: number
 *                 description: Longitude de destino
 *               totalSeats:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 8
 *                 description: Número total de assentos disponíveis
 *     responses:
 *       201:
 *         description: Carona criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Dados inválidos ou já possui carona ativa
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Usuário não é motorista
 */

/**
 * @swagger
 * /api/rides/me:
 *   get:
 *     summary: Listar caronas do motorista logado
 *     description: Retorna todas as caronas ativas do motorista autenticado
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de caronas do motorista
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: 'string', format: 'uuid' }
 *                   originAddress: { type: 'string' }
 *                   destinationAddress: { type: 'string' }
 *                   departureTime: { type: 'string', format: 'date-time' }
 *                   availableSeats: { type: 'integer' }
 *                   totalSeats: { type: 'integer' }
 *                   pendingRequests: { type: 'array', items: { $ref: '#/components/schemas/RideRequest' } }
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Usuário não é motorista
 */

/**
 * @swagger
 * /api/rides/{id}:
 *   get:
 *     summary: Obter detalhes de uma carona
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da carona
 *     responses:
 *       200:
 *         description: Detalhes da carona
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ride'
 *       404:
 *         description: Carona não encontrada ou inativa
 *   delete:
 *     summary: Cancelar uma carona
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da carona
 *     responses:
 *       200:
 *         description: Carona cancelada com sucesso
 *       403:
 *         description: Apenas o motorista pode cancelar
 *       404:
 *         description: Carona não encontrada
 */

/**
 * @swagger
 * /api/rides/{id}/requests:
 *   post:
 *     summary: Solicitar carona
 *     description: Passageiro solicita uma carona. O custo é calculado automaticamente baseado no costPerSeat da carona.
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da carona
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupLocation
 *               - dropoffLocation
 *               - requestedSeats
 *             properties:
 *               pickupLocation:
 *                 type: string
 *                 description: Endereço de embarque
 *               dropoffLocation:
 *                 type: string
 *                 description: Endereço de desembarque
 *               requestedSeats:
 *                 type: integer
 *                 minimum: 1
 *                 description: Número de assentos solicitados
 *     responses:
 *       201:
 *         description: Solicitação criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RideRequest'
 *       400:
 *         description: Erro na solicitação (assentos insuficientes, já solicitou, etc)
 *       404:
 *         description: Carona não encontrada
 *   get:
 *     summary: Listar solicitações de uma carona
 *     description: Retorna todas as solicitações pendentes para uma carona (apenas para o motorista)
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da carona
 *     responses:
 *       200:
 *         description: Lista de solicitações
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RideRequest'
 *       403:
 *         description: Apenas o motorista pode ver as solicitações
 */

/**
 * @swagger
 * /api/requests/me:
 *   get:
 *     summary: Listar minhas solicitações
 *     description: Retorna todas as solicitações do passageiro autenticado
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitações
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RideRequest'
 */

/**
 * @swagger
 * /api/requests/{id}:
 *   get:
 *     summary: Obter detalhes de uma solicitação
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da solicitação
 *     responses:
 *       200:
 *         description: Detalhes da solicitação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RideRequest'
 *       403:
 *         description: Não autorizado
 *       404:
 *         description: Solicitação não encontrada
 *   patch:
 *     summary: Atualizar status de uma solicitação
 *     description: Motorista pode aceitar/rejeitar; passageiro pode cancelar
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da solicitação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RideRequest'
 *       400:
 *         description: Transição de status inválida
 *       403:
 *         description: Não autorizado
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Obter perfil do usuário logado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 *   put:
 *     summary: Atualizar perfil do usuário logado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               photoUrl: { type: string }
 *               pixKey: { type: string }
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /api/users/me/role:
 *   post:
 *     summary: Tornar-se motorista
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuário agora tem role DRIVER
 *       401:
 *         description: Não autenticado
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *       409:
 *         description: Email já cadastrado
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Fazer login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login bem sucedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Credenciais inválidas
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Verifica status da API e conexão com o banco de dados
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 service: { type: string }
 *                 database: { type: string }
 */