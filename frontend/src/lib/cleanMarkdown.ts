/**
 * Strips markdown formatting from text to produce clean, human-readable output.
 */
export function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')          // bold
    .replace(/\*/g, '')            // italic
    .replace(/#{1,6}\s*/g, '')     // headers
    .replace(/`{1,3}[^`]*`{1,3}/g, (match) => match.replace(/`/g, '')) // inline/block code
    .replace(/`/g, '')             // remaining backticks
    .replace(/__/g, '')            // underscores
    .replace(/~~(.*?)~~/g, '$1')   // strikethrough
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links -> text only
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images -> alt text
    .replace(/^>\s?/gm, '')        // blockquotes
    .replace(/^[-+]\s/gm, '- ')    // normalize list markers
    .replace(/\\\$/g, '$')         // escaped dollar signs (LaTeX)
    .replace(/\$\$[^$]+\$\$/g, '') // block LaTeX
    .replace(/\$[^$]+\$/g, '')     // inline LaTeX
    .replace(/\n{3,}/g, '\n\n')    // normalize line breaks
    .trim();
}
