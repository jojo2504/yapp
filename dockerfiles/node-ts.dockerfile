FROM node:25-bookworm-slim

# Install TypeScript
RUN npm install typescript

# Create an unprivileged user for safety
RUN useradd -m runner
WORKDIR /sandbox
RUN chown -R runner:runner /sandbox

# Switch to non-root user
USER runner

ENTRYPOINT ["/bin/bash", "-c"]