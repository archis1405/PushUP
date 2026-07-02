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
pushup init
```

---

### Step 1: Basic Commit Flow

```bash
echo "Hello World" > sample.txt

pushup add sample.txt
pushup status

pushup commit "Initial commit"
pushup log
```

---

### Step 2: Modify File + Diff

```bash
echo "Hello PushUP" >> sample.txt

pushup add sample.txt
pushup diff

pushup commit "Updated file"
pushup log
```

---

### Step 3: Branching

```bash
pushup branch feature
pushup branch

pushup checkout feature
```

---

### Step 4: Work on Feature Branch

```bash
echo "Feature work" >> sample.txt

pushup add sample.txt
pushup commit "Feature commit"

pushup log
```

---

### Step 5: Merge Branch

```bash
pushup checkout main

pushup merge feature

pushup log
```

---

### Step 6: Show Commit Changes

Copy a commit hash from `log`

```bash
pushup show <commitHash>
```

---

### Step 7: Reset to Previous Commit

Copy an older commit hash

```bash
pushup reset <commitHash>
pushup log
```

---

### Step 8: Delete Branch

```bash
pushup delete-branch feature
pushup branch
```

---

## ⚡ Demo Flow Summary (Follow This Order)

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

## 💡 Tips for Interview

* Keep one terminal + file open side-by-side
* Copy commit hash once to reuse
* Explain while running commands (compare with Git)
* Keep file simple (sample.txt)

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

