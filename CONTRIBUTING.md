# Contributing to File-sharing-online

Thank you for your interest in contributing! This guide covers both how to submit changes and how maintainers can review and merge pull requests.

---

## For Contributors

### 1. Fork the Repository

1. Visit [https://github.com/manavdev468/File-sharing-online](https://github.com/manavdev468/File-sharing-online).
2. Click the **Fork** button in the top-right corner.
3. GitHub will create a copy of the repository under your own account.

---

### 2. Clone Your Fork

```bash
git clone https://github.com/<your-username>/File-sharing-online.git
cd File-sharing-online
```

---

### 3. Create a Branch

Always work on a new branch instead of `main`:

```bash
git checkout -b feature/your-feature-name
```

Use a descriptive name such as `fix/upload-button` or `feat/file-preview`.

---

### 4. Install Dependencies & Run Locally

```bash
npm install
npm start
```

Open your browser at **http://localhost:3001** to see the running application.

---

### 5. Make Your Changes

Edit the relevant files:

| File | Purpose |
|------|---------|
| `server.js` | Express server, file upload/download API, Socket.io events |
| `index.html` | Static front-end entry point |
| `style.css` | Stylesheet for the static front-end |
| `script.js` | JavaScript for the static front-end |

---

### 6. Commit Your Changes

```bash
git add .
git commit -m "feat: short description of what you changed"
```

Use a clear commit message that summarises the change.

---

### 7. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

---

### 8. Open a Pull Request

1. Go to your fork on GitHub.
2. GitHub will show a **"Compare & pull request"** banner — click it.
   - If the banner is not visible, click **Pull requests → New pull request**.
3. Set the **base repository** to `manavdev468/File-sharing-online` and the **base branch** to `main`.
4. Fill in the pull request template (description, type of change, testing notes).
5. Click **Create pull request**.

---

## For Maintainers — Merging a Pull Request

As the repository owner you can merge a pull request either through the GitHub web UI or locally via git.

### Option A: Merge via GitHub Web UI (Recommended)

1. Open the pull request on GitHub.
2. Review the changes in the **Files changed** tab.
3. If everything looks good, click **Merge pull request → Confirm merge**.

---

### Option B: Merge Locally via Git

Use this approach when you want to test the changes on your machine before merging.

**Step 1 – Fetch the PR branch from GitHub:**

```bash
# Replace PR_NUMBER with the actual pull request number (e.g. 42)
# Replace pr-branch-name with a descriptive local name (e.g. feature-file-preview)
git fetch origin pull/PR_NUMBER/head:pr-branch-name
```

**Step 2 – Check out the PR branch and verify the changes:**

```bash
git checkout pr-branch-name
npm install   # install any new dependencies
npm start     # test the app locally
```

**Step 3 – Switch back to your base branch:**

```bash
git checkout main  # or your base branch
```

**Step 4 – Merge the PR branch into main:**

```bash
git merge pr-branch-name
```

**Step 5 – Push the updated main branch to GitHub:**

```bash
git push origin main
```

GitHub will automatically detect the push and close the pull request as merged.

---

## Code Style

- Keep the existing code structure — no unnecessary refactors in unrelated areas.
- Use `const`/`let` instead of `var`.
- Keep functions small and focused.

---

## Reporting Bugs or Requesting Features

Open an [issue](https://github.com/manavdev468/File-sharing-online/issues) with a clear title and description before starting work, so we can discuss the best approach.
