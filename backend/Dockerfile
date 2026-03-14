FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ vips-dev

COPY package*.json ./
RUN npm install --omit=dev

RUN mkdir -p /app/data /app/uploads

COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]
