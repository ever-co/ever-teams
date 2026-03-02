# Zencoder Configuration for Ever Teams

This directory contains comprehensive AI assistant configuration and documentation for the Ever Teams project, specifically tailored for **Zencoder AI**.

---

## 📁 Directory Structure

```
.zencoder/
├── README.md                      # This file - overview of Zencoder configuration
├── AI-CONFIG-COMPARISON.md        # Comparison with other AI tool configurations
├── rules/
│   ├── repo.md                    # Auto-generated repository structure documentation
│   ├── workspace.md               # Workspace-specific rules and quick reference
│   └── coding-standards.md        # Detailed coding standards and best practices
└── workflows/                     # Future: Task-specific workflow definitions
```

---

## 📚 Configuration Files

### `ZENCODER.md` (Repository Root)

**Purpose**: Main comprehensive guide for Zencoder AI  
**Size**: ~400 lines  
**Scope**: Project-wide instructions

**Contents**:
- Project overview and structure
- Environment and tooling requirements
- Common commands and workflows
- Code organization principles
- Tech stack reference
- Testing and verification strategies
- Safety guidelines and permissions
- Commit conventions
- Docker and infrastructure setup
- Workspace management

**When to use**: Primary reference for understanding the project holistically

---

### `rules/repo.md`

**Purpose**: Auto-generated repository structure documentation  
**Type**: Auto-generated (via repository analysis tool)  
**Scope**: Repository structure and technical specifications

**Contents**:
- Repository summary
- Main components (apps/web, apps/mobile, apps/server-web, etc.)
- Per-project details:
  - Language and runtime versions
  - Dependencies
  - Build and installation commands
  - Testing frameworks
- Docker configuration
- Shared packages documentation
- Architectural organization

**When to use**: Quick reference for repository layout, versions, and commands

**Maintenance**: Regenerate periodically when:
- Adding/removing applications or packages
- Updating major dependencies or frameworks
- Changing Docker configurations
- Modifying build scripts or test infrastructure

---

### `rules/workspace.md`

**Purpose**: Workspace-specific rules and quick reference  
**Type**: Always-apply rule (via `alwaysApply: true` frontmatter)  
**Scope**: Day-to-day development guidance

**Contents**:
- Quick command reference table
- Runtime environment requirements
- Verification strategy (lint, build, typecheck)
- Environment variable handling
- Code organization principles
- Coding standards (quick reference)
- Safety guidelines (categorized)
- Monorepo structure overview
- Dependency management
- Internationalization rules
- Commit conventions
- Zencoder workflow
- Common pitfalls to avoid
- Final task checklist

**When to use**: Daily reference during development and code modifications

---

### `rules/coding-standards.md`

**Purpose**: Detailed coding standards and best practices  
**Type**: Always-apply rule (via `alwaysApply: true` frontmatter)  
**Scope**: Code quality and consistency

**Contents**:
- TypeScript standards (types, interfaces, generics, enums)
- React component patterns (structure, props, composition, conditionals)
- State management (local, global, server state with examples)
- API and service layer architecture
- Form handling (React Hook Form + Zod)
- Styling and CSS (Tailwind CSS patterns)
- Error handling patterns
- Performance optimization (memoization, code splitting)
- Security best practices (XSS, auth, API security)
- Testing patterns (component, service, mocking)
- File and folder naming conventions
- Summary principles

**When to use**: Reference when implementing features, refactoring code, or reviewing patterns

---

### `AI-CONFIG-COMPARISON.md`

**Purpose**: Analysis and comparison of all AI tool configurations  
**Type**: Documentation  
**Scope**: Meta-documentation

**Contents**:
- Overview of all AI configurations (Claude, Cursor, Augment, Zencoder)
- File structure comparison
- Configuration philosophy analysis
- Key improvements in Zencoder setup
- Recommendations for maintaining consistency
- Synergy between different AI tool configs

**When to use**: Understanding Zencoder's approach relative to other AI tools

---

## 🚀 Quick Start for Zencoder

When starting work on this repository, Zencoder should:

1. **Read** `ZENCODER.md` at the root for comprehensive project understanding
2. **Reference** `.zencoder/rules/repo.md` for repository structure and commands
3. **Follow** `.zencoder/rules/workspace.md` for day-to-day guidelines
4. **Consult** `.zencoder/rules/coding-standards.md` when implementing features

---

## 🔄 Maintenance Guidelines

### When to Update Configuration

**Update `ZENCODER.md`** when:
- Major architectural changes occur
- New technologies or frameworks are adopted
- Environment setup changes
- New safety guidelines are needed

**Regenerate `repo.md`** when:
- Adding/removing applications or packages
- Updating major dependencies (Next.js, React, Electron, etc.)
- Changing Docker configurations
- Modifying test infrastructure or build scripts

**Update `workspace.md`** when:
- New verification commands are introduced
- Common pitfalls are discovered
- Workspace structure changes
- New monorepo packages are added

**Update `coding-standards.md`** when:
- New coding patterns are established
- Best practices evolve
- New libraries/frameworks introduce new patterns
- Security vulnerabilities require new guidelines

---

## 🔗 Relationship with Other AI Configs

Ever Teams repository includes configurations for multiple AI coding assistants:

| AI Tool | Config File(s) | Relationship to Zencoder |
|---------|----------------|--------------------------|
| **Claude Code** | `CLAUDE.md` | Zencoder references for shared information |
| **Cursor** | `AGENTS.md`, `.cursor/mcp.json` | Independent but cross-referenced |
| **Augment Code** | `AUGMENT.md`, `.augment/rules/workspace.md` | Independent but cross-referenced |
| **Zencoder** | `ZENCODER.md`, `.zencoder/rules/*.md` | Most comprehensive and modular |

### Key Differentiators

**Zencoder Configuration Advantages**:
- ✅ Modular organization (multiple focused files vs single monolithic files)
- ✅ Auto-generated repository documentation (prevents drift)
- ✅ Comprehensive coding standards (~350 lines vs ~30 lines in other configs)
- ✅ Explicit workflow guidance for AI operations
- ✅ Detailed verification strategy
- ✅ Categorized safety guidelines

See `AI-CONFIG-COMPARISON.md` for detailed analysis.

---

## 📖 Documentation Philosophy

### Core Principles

1. **Modular**: Separate concerns into focused, maintainable files
2. **Comprehensive**: Provide depth where needed, brevity where appropriate
3. **Up-to-date**: Auto-generate where possible, manual updates where necessary
4. **Actionable**: Clear commands, explicit workflows, specific examples
5. **Consistent**: Cross-reference between files, maintain single source of truth
6. **Safe**: Explicit permissions, categorized safety guidelines

### Documentation Hierarchy

```
Level 1: ZENCODER.md
  └─ Comprehensive overview, primary reference
  
Level 2: .zencoder/rules/
  ├─ repo.md (auto-generated structure)
  ├─ workspace.md (daily reference)
  └─ coding-standards.md (detailed patterns)
  
Level 3: Cross-references
  ├─ CLAUDE.md (Claude-specific)
  ├─ AGENTS.md (Cursor-specific)
  └─ README.md (user documentation)
```

---

## 🛠️ Tools and Utilities

### Repository Analysis Tool

The repository analysis tool generates `repo.md` by:
- Scanning all `package.json` files
- Identifying Docker configurations
- Detecting test frameworks and configurations
- Analyzing build scripts and commands
- Documenting dependencies and versions

**To regenerate**:
```bash
# Future: Automated regeneration script
# For now, manually update via repository exploration
```

---

## 📝 Contributing to Configuration

When contributing to Zencoder configuration:

1. **Maintain consistency** with existing style and structure
2. **Add frontmatter** to rule files:
   ```markdown
   ---
   description: Brief description
   alwaysApply: true
   ---
   ```
3. **Cross-reference** related documentation
4. **Test changes** by using Zencoder with the updated configuration
5. **Update this README** if adding new files or significant changes

---

## 🎯 Goals and Vision

### Current State (v1.0)

- ✅ Comprehensive project documentation
- ✅ Auto-generated repository structure
- ✅ Detailed coding standards
- ✅ Workspace-specific rules
- ✅ Clear verification strategy
- ✅ Safety and permission guidelines

### Future Enhancements

- 🔄 Automated `repo.md` regeneration script
- 🔄 Task-specific workflow definitions in `workflows/`
- 🔄 Integration with project-specific tools and scripts
- 🔄 Migration guides for common refactoring patterns
- 🔄 Performance monitoring and optimization checklists
- 🔄 Security audit guidelines and checklists

---

## 📞 Support and Feedback

For issues, improvements, or feedback on Zencoder configuration:

- **Project Repository**: https://github.com/ever-co/ever-teams
- **Documentation**: https://docs.ever.team
- **Issue Tracker**: https://github.com/ever-co/ever-teams/issues

---

## 📄 License

This configuration documentation is part of the Ever Teams project and follows the same license as the main project (AGPL-3.0).

---

**Configuration Version**: 1.0.0  
**Last Updated**: 2026-01-23  
**Maintained By**: Ever Teams Development Team
