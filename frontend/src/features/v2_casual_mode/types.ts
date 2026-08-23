export interface ExtractedTag {
  type: string;
  identifier: string;
}

export interface CasualRule {
  id: string;
  title: string;
  summary: string;
  tags: ExtractedTag[];
  ruleMd: string;
  active: boolean;
}
