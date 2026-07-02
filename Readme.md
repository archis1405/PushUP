# PushUP

Welcome to PushUP, a powerful development tool for managing and organizing your projects.

## Features(v0)

- Project creation and initialization
- Version control integration
- Task management and tracking
- Collaboration and team communication
- Documentation generation
- Code review and feedback

## Features(v1)

- Branch creation and branch management
- Switching between different branches
- Merging of branches

## Features(v2)

- Implemented the reset functionality
- Implement diff command to see the differences between the staged changes and the last changes.



## Getting Started

To get started with PushUP, follow these steps:

1. Install PushUP by running `npm install pushup` in your project directory.
2. Initialize a new project by running `pushup init` and follow the prompts.
3. Start adding your code and files to the project.
4. Use the built-in version control features to track changes and collaborate with your team.
5. Manage tasks and track progress using the task management module.
6. Generate documentation for your project using the documentation generation tool.
7. Review and provide feedback on code changes using the code review module.

## Commands : 

### Step 0: Initialize Repository

```bash
node index.js init
```

---

### Step 1: Basic Commit Flow

```bash
echo "Hello World" > sample.txt

node index.js add sample.txt
node index.js status

node index.js commit "Initial commit"
node index.js log
```

---

### Step 2: Modify File + Diff

```bash
echo "Hello PushUP" >> sample.txt

node index.js add sample.txt
node index.js diff

node index.js commit "Updated file"
node index.js log
```

---

### Step 3: Branching

```bash
node index.js branch feature
node index.js branch

node index.js checkout feature
```

---

### Step 4: Work on Feature Branch

```bash
echo "Feature work" >> sample.txt

node index.js add sample.txt
node index.js commit "Feature commit"

node index.js log
```

---

### Step 5: Merge Branch

```bash
node index.js checkout main

node index.js merge feature

node index.js log
```

---

### Step 6: Show Commit Changes

Copy a commit hash from `log`

```bash
node index.js show <commitHash>
```

---

### Step 7: Reset to Previous Commit
Copy an older commit hash

```bash
node index.js reset <commitHash>
node index.js log
```

---

### Step 8: Delete Branch

```bash
node index.js delete-branch feature
node index.js branch
```

---

## Demo Flow Summary (Follow This Order)

1. Initialize repo
2. Add + commit
3. Modify + diff
4. Create branch
5. Switch branch
6. Commit in branch
7. Merge branch
8. Show commit diff
9. Reset
10. Delete branch

---

## Tips for Interview

* Keep one terminal + file open side-by-side
* Copy commit hash once to reuse
* Speak while executing commands
* Keep file small (sample.txt)

---



## Contributing

We welcome contributions from the community. If you would like to contribute to PushUP

