# Build context: repository root.  docker build -f server/Dockerfile -t science26-api .
FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
      g++ cmake make pkg-config libpq-dev libhiredis-dev nlohmann-json3-dev libcpp-httplib-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY server/ .
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j"$(nproc)"

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 libhiredis0.14 libcpp-httplib0.11 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home app
COPY --from=build /src/build/api /usr/local/bin/api
USER app
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/api/health || exit 1
CMD ["api"]
