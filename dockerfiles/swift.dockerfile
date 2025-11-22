FROM swift:6.2.0

# Create an unprivileged user for safety
RUN useradd -m runner
WORKDIR /tmp
RUN chown -R runner:runner /tmp

# Switch to non-root user
USER runner