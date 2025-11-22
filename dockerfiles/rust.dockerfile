FROM rust:1.91.0-slim-bookworm

# Create an unprivileged user for safety
RUN useradd -m runner
WORKDIR /tmp
RUN chown -R runner:runner /tmp

# Switch to non-root user
USER runner