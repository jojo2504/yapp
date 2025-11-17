FROM node:25-bookworm-slim

WORKDIR /app

# Copy package files first for dependency caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application (dependencies and other stuff)
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
