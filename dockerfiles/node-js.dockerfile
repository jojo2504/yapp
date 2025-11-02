FROM node:25-bookworm-slim

# Create an unprivileged user for safety
RUN useradd -m runner
WORKDIR /sandbox
RUN chown -R runner:runner /sandbox

# Switch to non-root user
USER runner

ENTRYPOINT ["/bin/bash", "-c"]