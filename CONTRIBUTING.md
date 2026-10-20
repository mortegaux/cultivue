# Contributing to CultiVue

Thank you for your interest in contributing to CultiVue! We welcome bug reports, feature requests, documentation improvements, and pull requests.

## Development Workflow

1. **Fork & Clone:**
   ```bash
   git clone https://github.com/<your-username>/cultivue.git
   cd cultivue
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run Locally:**
   ```bash
   npm start
   ```
   Or use Docker Compose:
   ```bash
   docker compose up --build
   ```

4. **Run the Test Suite:**
   Before submitting code, ensure all tests pass:
   ```bash
   npm test
   ```

## Commit Guidelines

We use conventional commit messages:
* `feat:` A new user-facing feature
* `fix:` A bug fix
* `docs:` Documentation changes only
* `refactor:` Code improvements that neither fix a bug nor add a feature
* `test:` Adding or updating tests
* `chore:` Build process, dependency updates, or auxiliary tool changes

## Pull Requests

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and add tests where applicable.
3. Open a Pull Request with a clear description of the problem solved and changes made.
