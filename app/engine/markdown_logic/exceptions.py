"""Domain exceptions for markdown-as-logic parsing."""


class MarkdownLogicError(Exception):
    """Base error for markdown rule parsing."""


class FrontmatterError(MarkdownLogicError):
    """Raised when YAML frontmatter is missing or structurally invalid."""


class MalformedTagError(MarkdownLogicError):
    """Raised when a tag attribute block cannot be parsed."""


class SecurityError(MarkdownLogicError):
    """Raised when rule compilation or evaluation encounters unsafe constructs."""
