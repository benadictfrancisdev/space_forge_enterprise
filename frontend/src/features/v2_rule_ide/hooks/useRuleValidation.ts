import { useEffect, useState } from "react";

const TAG_REGEX = /@([a-zA-Z0-9_]+):([a-zA-Z0-9_.-]+)/g;

const DANGEROUS_PATTERNS = ["eval(", "exec(", "__import__", "import os"] as const;

const SECURITY_ERROR =
  "SecurityError: Unsafe arbitrary code execution detected. Only boolean conditions are allowed.";

export interface ExtractedTag {
  type: string;
  identifier: string;
}

export interface RuleValidationResult {
  isValid: boolean;
  extractedTags: ExtractedTag[];
  errors: string[];
  isAnalyzing: boolean;
}

function extractTags(content: string): ExtractedTag[] {
  const tags: ExtractedTag[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(TAG_REGEX)) {
    const type = match[1];
    const identifier = match[2];
    const key = `${type}:${identifier}`;

    if (!seen.has(key)) {
      seen.add(key);
      tags.push({ type, identifier });
    }
  }

  return tags;
}

function analyzeContent(
  content: string,
): Pick<RuleValidationResult, "isValid" | "extractedTags" | "errors"> {
  const extractedTags = extractTags(content);
  const hasDangerousPattern = DANGEROUS_PATTERNS.some((pattern) =>
    content.includes(pattern),
  );

  if (hasDangerousPattern) {
    return {
      isValid: false,
      extractedTags,
      errors: [SECURITY_ERROR],
    };
  }

  return {
    isValid: true,
    extractedTags,
    errors: [],
  };
}

export function useRuleValidation(content: string): RuleValidationResult {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState<
    Pick<RuleValidationResult, "isValid" | "extractedTags" | "errors">
  >(() => analyzeContent(content));

  useEffect(() => {
    setIsAnalyzing(true);

    const timer = window.setTimeout(() => {
      setResult(analyzeContent(content));
      setIsAnalyzing(false);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [content]);

  return {
    ...result,
    isAnalyzing,
  };
}
