FROM golang:1.25.3-bookworm

ENV GOCACHE=/go/cache
ENV GOMODCACHE=/go/pkg/mod

RUN mkdir -p /go/cache /go/pkg/mod && \
    chmod -R 777 /go/cache /go/pkg/mod

# Pre-warm the build cache
RUN go install std

# Create an unprivileged user for safety
RUN useradd -m runner
WORKDIR /tmp
RUN chown -R runner:runner /tmp

# Switch to non-root user
USER runner