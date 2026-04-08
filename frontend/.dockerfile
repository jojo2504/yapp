FROM node:22-alpine

WORKDIR /app

RUN npm install -g vite

COPY package.json package-lock.json ./
RUN npm install

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
