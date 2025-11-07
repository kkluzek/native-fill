import type { DomainRule, DomainRuleResolution } from "@types/data";

const matchesHost = (pattern: string, host: string) => {
  if (!pattern || pattern === "*" || pattern === "global") {
    return true;
  }
  const normalizedPattern = pattern.toLowerCase();
  const normalizedHost = host.toLowerCase();
  if (!normalizedPattern.includes("*")) {
    return normalizedHost === normalizedPattern;
  }
  const regexString = normalizedPattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, "[^.]+")
    .replace(/\|/g, "|");
  const regex = new RegExp(`^(${regexString})$`);
  return regex.test(normalizedHost);
};

const rankPattern = (pattern: string) => {
  if (pattern === "global" || pattern === "*") return 0;
  if (pattern.startsWith("*.*.")) return 1;
  if (pattern.startsWith("*.")) return 2;
  return 3;
};

export const resolveDomainRules = (
  host: string,
  rules: DomainRule[]
): DomainRuleResolution => {
  const includeFolders = new Set<string>();
  const excludeFolders = new Set<string>();
  const boostTags = new Set<string>();
  let disable = false;

  rules
    .map((rule) => {
      const patternOptions = rule.pattern.split("|");
      const matchedRank = patternOptions.reduce<{ rank: number; rule: DomainRule } | null>(
        (acc, pattern) => {
          if (matchesHost(pattern, host)) {
            const rank = rankPattern(pattern);
            if (!acc || rank > acc.rank) {
              return { rank, rule };
            }
          }
          return acc;
        },
        null
      );
      return matchedRank;
    })
    .filter((result): result is { rank: number; rule: DomainRule } => Boolean(result))
    .sort((a, b) => b.rank - a.rank)
    .forEach(({ rule }) => {
      if (rule.disableOnHost) {
        disable = true;
      }
      rule.includeFolders.forEach((folder) => includeFolders.add(folder));
      rule.excludeFolders.forEach((folder) => excludeFolders.add(folder));
      rule.boostTags.forEach((tag) => boostTags.add(tag));
    });

  return { disable, includeFolders, excludeFolders, boostTags };
};
