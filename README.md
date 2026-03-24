# Unicarona Backend

Backend base em Node.js com TypeScript e Express, preparado para servir como ponto de partida para APIs escalaveis, com arquitetura em camadas, configuracao de ambiente, lint, formatacao e estrutura pronta para producao.

## Tecnologias utilizadas

- Node.js
- TypeScript
- Express
- ESLint
- Prettier
- dotenv

## Como rodar o projeto

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

3. Rode o projeto em desenvolvimento:

```bash
npm run dev
```

4. Para gerar a build de producao:

```bash
npm run build
```

5. Para executar a versao compilada:

```bash
npm start
```

## Scripts disponiveis

- `npm run dev`: inicia o servidor em modo desenvolvimento com recarga automatica.
- `npm run build`: compila o projeto TypeScript para a pasta `dist/`.
- `npm start`: executa a aplicacao compilada em ambiente de producao.
- `npm run lint`: analisa o codigo com ESLint.
- `npm run format`: formata os arquivos com Prettier.

## Estrutura de pastas

```text
src/
  routes/
  controllers/
  services/
  models/
  middlewares/
  app.ts
  server.ts
```

### Papel de cada camada

- `routes`: define os endpoints e conecta cada rota ao controller correspondente.
- `controllers`: recebe a requisicao HTTP, valida a entrada quando necessario e devolve a resposta.
- `services`: concentra as regras de negocio e a logica reutilizavel da aplicacao.
- `models`: armazena interfaces, tipos e contratos de dados da aplicacao.
- `middlewares`: executa logicas transversais, como tratamento de erros, autenticacao, logs e interceptacao de requests.
- `app.ts`: configura a aplicacao Express, middlewares globais e registro das rotas.
- `server.ts`: inicializa variaveis de ambiente e sobe o servidor HTTP.

## Exemplo de rota

O projeto inclui a rota `GET /api/health`, que retorna o status basico da API.

## Variaveis de ambiente

O projeto utiliza `dotenv` para carregar configuracoes locais a partir do arquivo `.env`.

- `.env.example` documenta as variaveis esperadas.
- `.env` esta ignorado no versionamento por seguranca.

## Fluxo de branches

Este projeto segue um Gitflow simplificado:

- `main`: ambiente de producao e releases estaveis.
- `develop`: integracao continua das entregas antes da promocao para producao.
- `feat/nome-da-feature`: desenvolvimento de novas funcionalidades.
- `fix/nome-do-fix`: correcao de bugs.
- `chore/nome-da-tarefa`: tarefas tecnicas, manutencao e ajustes internos.

## Padrao de commits

Os commits devem seguir o padrao Conventional Commits:

- `feat: add user authentication`
- `fix: correct validation error`
- `chore: update dependencies`
- `refactor: improve service layer`

## Escalabilidade e manutencao

Esta base foi organizada para facilitar crescimento do backend com separacao clara de responsabilidades, padroes consistentes de configuracao e caminho simples para adicionar novas rotas, servicos e middlewares sem acoplamento desnecessario.
