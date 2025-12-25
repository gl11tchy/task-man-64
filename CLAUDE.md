# Project Guidelines

## Mandatory: Serena Integration

**RULE #1: You MUST use Serena tools for ALL code navigation and editing operations.**

This is not optional. Serena provides semantic code understanding and should be used for:

- **Code navigation**: Use `find_symbol`, `get_symbols_overview`, `find_referencing_symbols` instead of grep/glob
- **Code reading**: Use `read_file` or symbolic tools with `include_body=True` instead of cat/Read
- **Code editing**: Use `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`, `replace_content` instead of Edit/Write
- **File search**: Use `find_file`, `search_for_pattern`, `list_dir` instead of bash find/ls
- **Project context**: Check `list_memories` and read relevant memories for project-specific knowledge

### Why Serena?

1. **Semantic understanding** - Serena understands code structure, not just text
2. **Precise edits** - Symbol-level operations prevent accidental changes
3. **Relationship tracking** - Easily find references and dependencies
4. **Memory persistence** - Project knowledge persists across conversations

### Exceptions

Only fall back to non-Serena tools when:
- Serena tools are unavailable or erroring
- The operation is purely file-system based (git, npm, etc.)
- Explicitly instructed by the user
