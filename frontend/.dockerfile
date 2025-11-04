FROM node:25-bookworm-slim

WORKDIR /app

# Copy package files first for dependency caching
COPY package*.json ./

# Install dependencies
RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev"]