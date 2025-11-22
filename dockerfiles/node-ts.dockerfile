FROM node:25-bookworm-slim

# Install TypeScript
RUN npm install typescript

# Create an unprivileged user for safety
RUN useradd -m runner
WORKDIR /tmp
RUN chown -R runner:runner /tmp

# Switch to non-root user
USER runner