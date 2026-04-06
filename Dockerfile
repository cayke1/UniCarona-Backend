FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npm run prisma:generate

COPY tsconfig.json ./
COPY src ./src
COPY .env.example ./
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
