FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --omit=dev --workspace=backend

COPY backend/src ./backend/src

USER node
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace=backend"]
