FROM rust:1.91.0-slim-bookworm

RUN USER=root cargo new --bin judge
WORKDIR /judge

# 2. Copy our manifests
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

# 3. Build only the dependencies to cache them
RUN cargo build --release
RUN rm src/*.rs

# 4. Now that the dependency is built, copy your source code
COPY ./src ./src

# 5. Build for release.
RUN rm ./target/release/deps/judge*
RUN cargo install --path .

CMD ["judge"]