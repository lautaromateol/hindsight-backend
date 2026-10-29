FROM node:22-slim AS build
WORKDIR /app
# prisma/ y prisma.config.ts van antes de npm ci: el postinstall corre prisma generate.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
# openssl y certificados: el motor de migraciones de Prisma y las conexiones TLS a la base.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
# Se conserva node_modules completo: el release_command usa la CLI de prisma (devDependency).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# El puerto es fijo (src/app.ts).
EXPOSE 3000
CMD ["node", "dist/app.js"]
