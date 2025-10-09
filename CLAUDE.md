# Project Documentation

## Architecture References

- [Tauri Middleware Architecture](knowledge-docs/architecture/tauri-middleware-architecture.md) - Comprehensive architecture for parsing XML context documents and serving markdown sections to the frontend's CodeMirror editor

## Development Guidelines

### Test-Driven Development (TDD)

This project follows Test-Driven Development practices:

1. **Write Tests First** - Write failing tests before implementing features
2. **Red-Green-Refactor Cycle**:
   - RED: Write a failing test
   - GREEN: Write minimal code to make it pass
   - REFACTOR: Improve code while keeping tests green
3. **Test Coverage** - Aim for >80% test coverage
4. **Unit Tests** - Test individual functions and modules in isolation
5. **Integration Tests** - Test full workflows (XML parsing → JSON output)

### Rust Testing Strategy

- Place unit tests in the same file as the code using `#[cfg(test)]` modules
- Place integration tests in `src-tauri/tests/` directory
- Use `cargo test` to run all tests
- Use `cargo test --test integration_test` to run specific integration tests
