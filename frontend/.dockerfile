FROM node:25-bookworm-slim

USER root

WORKDIR /app

COPY . .

# https://stackoverflow.com/questions/36155072/disable-npm-cache
RUN npm install --force

EXPOSE 5173

CMD ["npm", "run", "dev"]