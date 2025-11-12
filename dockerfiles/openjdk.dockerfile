FROM openjdk:26-ea-jdk-slim-bookworm

# Create an unprivileged user for safety
RUN useradd -m runner
WORKDIR /sandbox
RUN chown -R runner:runner /sandbox

# Switch to non-root user
USER runner

ENTRYPOINT ["/bin/bash", "-c"]