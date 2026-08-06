import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, TrendingUp, Users, Target, AlertTriangle, GitBranch, Calendar } from "lucide-react";
import { toast } from "sonner";

interface BehavioralTemplatesProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface SQLTemplate {
  id: string;
  name: string;
  description: string;
  category: "segmentation" | "retention" | "growth" | "funnel" | "risk";
  icon: React.ComponentType<{ className?: string }>;
  requiredMappings: { role: string; type: "date" | "numeric" | "categorical" | "any"; description: string }[];
  generateSQL: (mapping: Record<string, string>, tableName: string) => string;
}

const templates: SQLTemplate[] = [
  {
    id: "rfm",
    name: "RFM Segmentation",
    description: "Segment customers by Recency, Frequency, and Monetary value",
    category: "segmentation",
    icon: Users,
    requiredMappings: [
      { role: "customer_id", type: "any", description: "Customer identifier" },
      { role: "order_date", type: "date", description: "Transaction date" },
      { role: "amount", type: "numeric", description: "Transaction amount" },
    ],
    generateSQL: (m, table) => `-- RFM Segmentation Analysis
WITH rfm_base AS (
  SELECT 
    ${m.customer_id} as customer_id,
    DATEDIFF(day, MAX(${m.order_date}), CURRENT_DATE) as recency,
    COUNT(*) as frequency,
    SUM(${m.amount}) as monetary
  FROM ${table}
  GROUP BY ${m.customer_id}
),
rfm_scores AS (
  SELECT 
    customer_id,
    recency,
    frequency,
    monetary,
    NTILE(5) OVER (ORDER BY recency DESC) as r_score,
    NTILE(5) OVER (ORDER BY frequency) as f_score,
    NTILE(5) OVER (ORDER BY monetary) as m_score
  FROM rfm_base
)
SELECT 
  customer_id,
  recency,
  frequency,
  monetary,
  r_score,
  f_score,
  m_score,
  CONCAT(r_score, f_score, m_score) as rfm_segment,
  CASE 
    WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
    WHEN r_score >= 4 AND f_score >= 3 THEN 'Loyal Customers'
    WHEN r_score >= 3 AND f_score >= 1 AND m_score >= 2 THEN 'Potential Loyalists'
    WHEN r_score >= 4 AND f_score <= 2 THEN 'Recent Customers'
    WHEN r_score >= 3 AND f_score >= 3 THEN 'Promising'
    WHEN r_score <= 2 AND f_score >= 4 THEN 'At Risk'
    WHEN r_score <= 2 AND f_score <= 2 THEN 'Hibernating'
    ELSE 'Need Attention'
  END as customer_segment
FROM rfm_scores
ORDER BY monetary DESC;`,
  },
  {
    id: "cohort_retention",
    name: "Cohort Retention",
    description: "Track user retention by signup cohort",
    category: "retention",
    icon: TrendingUp,
    requiredMappings: [
      { role: "user_id", type: "any", description: "User identifier" },
      { role: "signup_date", type: "date", description: "User signup date" },
      { role: "activity_date", type: "date", description: "Activity/event date" },
    ],
    generateSQL: (m, table) => `-- Cohort Retention Analysis
WITH cohorts AS (
  SELECT 
    ${m.user_id} as user_id,
    DATE_TRUNC('month', MIN(${m.signup_date})) as cohort_month
  FROM ${table}
  GROUP BY ${m.user_id}
),
user_activities AS (
  SELECT 
    t.${m.user_id} as user_id,
    c.cohort_month,
    DATE_TRUNC('month', t.${m.activity_date}) as activity_month,
    DATEDIFF(month, c.cohort_month, DATE_TRUNC('month', t.${m.activity_date})) as month_number
  FROM ${table} t
  JOIN cohorts c ON t.${m.user_id} = c.user_id
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(DISTINCT user_id) as cohort_size
  FROM cohorts
  GROUP BY cohort_month
),
retention AS (
  SELECT 
    cohort_month,
    month_number,
    COUNT(DISTINCT user_id) as active_users
  FROM user_activities
  GROUP BY cohort_month, month_number
)
SELECT 
  r.cohort_month,
  cs.cohort_size,
  r.month_number,
  r.active_users,
  ROUND(100.0 * r.active_users / cs.cohort_size, 2) as retention_rate
FROM retention r
JOIN cohort_sizes cs ON r.cohort_month = cs.cohort_month
ORDER BY r.cohort_month, r.month_number;`,
  },
  {
    id: "funnel",
    name: "Funnel Analysis",
    description: "Track conversion through multi-step funnel",
    category: "funnel",
    icon: Target,
    requiredMappings: [
      { role: "user_id", type: "any", description: "User identifier" },
      { role: "event_name", type: "categorical", description: "Event/step name" },
      { role: "event_date", type: "date", description: "Event timestamp" },
    ],
    generateSQL: (m, table) => `-- Funnel Conversion Analysis
WITH funnel_steps AS (
  SELECT 
    ${m.user_id} as user_id,
    ${m.event_name} as step_name,
    MIN(${m.event_date}) as step_time,
    ROW_NUMBER() OVER (PARTITION BY ${m.user_id} ORDER BY MIN(${m.event_date})) as step_order
  FROM ${table}
  GROUP BY ${m.user_id}, ${m.event_name}
),
step_counts AS (
  SELECT 
    step_name,
    step_order,
    COUNT(DISTINCT user_id) as users_at_step
  FROM funnel_steps
  GROUP BY step_name, step_order
)
SELECT 
  step_name,
  step_order,
  users_at_step,
  FIRST_VALUE(users_at_step) OVER (ORDER BY step_order) as funnel_start,
  ROUND(100.0 * users_at_step / FIRST_VALUE(users_at_step) OVER (ORDER BY step_order), 2) as conversion_from_start,
  LAG(users_at_step) OVER (ORDER BY step_order) as previous_step_users,
  ROUND(100.0 * users_at_step / NULLIF(LAG(users_at_step) OVER (ORDER BY step_order), 0), 2) as step_conversion
FROM step_counts
ORDER BY step_order;`,
  },
  {
    id: "churn",
    name: "Churn Detection",
    description: "Identify at-risk customers based on activity patterns",
    category: "risk",
    icon: AlertTriangle,
    requiredMappings: [
      { role: "customer_id", type: "any", description: "Customer identifier" },
      { role: "last_activity", type: "date", description: "Last activity date" },
      { role: "total_spend", type: "numeric", description: "Total spend/value" },
    ],
    generateSQL: (m, table) => `-- Churn Risk Detection
WITH customer_metrics AS (
  SELECT 
    ${m.customer_id} as customer_id,
    MAX(${m.last_activity}) as last_activity_date,
    DATEDIFF(day, MAX(${m.last_activity}), CURRENT_DATE) as days_inactive,
    SUM(${m.total_spend}) as lifetime_value,
    COUNT(*) as total_transactions,
    AVG(${m.total_spend}) as avg_transaction_value
  FROM ${table}
  GROUP BY ${m.customer_id}
),
churn_scores AS (
  SELECT 
    *,
    CASE 
      WHEN days_inactive > 90 THEN 'High Risk'
      WHEN days_inactive > 60 THEN 'Medium Risk'
      WHEN days_inactive > 30 THEN 'Low Risk'
      ELSE 'Active'
    END as churn_risk,
    NTILE(10) OVER (ORDER BY lifetime_value DESC) as value_decile
  FROM customer_metrics
)
SELECT 
  customer_id,
  last_activity_date,
  days_inactive,
  lifetime_value,
  total_transactions,
  avg_transaction_value,
  churn_risk,
  value_decile,
  CASE 
    WHEN churn_risk IN ('High Risk', 'Medium Risk') AND value_decile <= 3 THEN 'Priority Retention'
    WHEN churn_risk = 'High Risk' THEN 'Re-engagement Campaign'
    WHEN churn_risk = 'Medium Risk' THEN 'Nurture Campaign'
    ELSE 'Standard Monitoring'
  END as recommended_action
FROM churn_scores
ORDER BY 
  CASE churn_risk 
    WHEN 'High Risk' THEN 1 
    WHEN 'Medium Risk' THEN 2 
    WHEN 'Low Risk' THEN 3 
    ELSE 4 
  END,
  lifetime_value DESC;`,
  },
  {
    id: "yoy_growth",
    name: "YoY/MoM Growth",
    description: "Period-over-period growth analysis with trends",
    category: "growth",
    icon: GitBranch,
    requiredMappings: [
      { role: "date_col", type: "date", description: "Date column" },
      { role: "metric", type: "numeric", description: "Metric to track" },
    ],
    generateSQL: (m, table) => `-- Year-over-Year & Month-over-Month Growth
WITH monthly_metrics AS (
  SELECT 
    DATE_TRUNC('month', ${m.date_col}) as month,
    SUM(${m.metric}) as metric_value,
    COUNT(*) as record_count
  FROM ${table}
  GROUP BY DATE_TRUNC('month', ${m.date_col})
),
growth_calc AS (
  SELECT 
    month,
    metric_value,
    record_count,
    LAG(metric_value, 1) OVER (ORDER BY month) as prev_month_value,
    LAG(metric_value, 12) OVER (ORDER BY month) as prev_year_value
  FROM monthly_metrics
)
SELECT 
  month,
  metric_value,
  record_count,
  prev_month_value,
  prev_year_value,
  ROUND(100.0 * (metric_value - prev_month_value) / NULLIF(prev_month_value, 0), 2) as mom_growth_pct,
  ROUND(100.0 * (metric_value - prev_year_value) / NULLIF(prev_year_value, 0), 2) as yoy_growth_pct,
  AVG(metric_value) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_avg_3m
FROM growth_calc
ORDER BY month DESC;`,
  },
  {
    id: "rolling_window",
    name: "Rolling Window Analysis",
    description: "Calculate rolling metrics with window functions",
    category: "growth",
    icon: Calendar,
    requiredMappings: [
      { role: "date_col", type: "date", description: "Date column" },
      { role: "metric", type: "numeric", description: "Metric to analyze" },
      { role: "group_by", type: "categorical", description: "Grouping dimension (optional)" },
    ],
    generateSQL: (m, table) => `-- Rolling Window Analytics
WITH daily_metrics AS (
  SELECT 
    DATE(${m.date_col}) as date,
    ${m.group_by ? `${m.group_by} as dimension,` : ""}
    SUM(${m.metric}) as daily_total,
    COUNT(*) as daily_count,
    AVG(${m.metric}) as daily_avg
  FROM ${table}
  GROUP BY DATE(${m.date_col})${m.group_by ? `, ${m.group_by}` : ""}
)
SELECT 
  date,
  ${m.group_by ? "dimension," : ""}
  daily_total,
  daily_count,
  daily_avg,
  -- 7-day rolling metrics
  SUM(daily_total) OVER (${m.group_by ? "PARTITION BY dimension " : ""}ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_7d_sum,
  AVG(daily_total) OVER (${m.group_by ? "PARTITION BY dimension " : ""}ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_7d_avg,
  -- 30-day rolling metrics
  SUM(daily_total) OVER (${m.group_by ? "PARTITION BY dimension " : ""}ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as rolling_30d_sum,
  AVG(daily_total) OVER (${m.group_by ? "PARTITION BY dimension " : ""}ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as rolling_30d_avg,
  -- Running total
  SUM(daily_total) OVER (${m.group_by ? "PARTITION BY dimension " : ""}ORDER BY date) as cumulative_total,
  -- Rank
  RANK() OVER (${m.group_by ? "PARTITION BY dimension " : ""}ORDER BY daily_total DESC) as daily_rank
FROM daily_metrics
ORDER BY date DESC;`,
  },
];

const BehavioralTemplates = ({ data, columns, columnTypes, datasetName }: BehavioralTemplatesProps) => {
  const tableName = useMemo(() =>
    datasetName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
    [datasetName]
  );

  const [selectedTemplate, setSelectedTemplate] = useState<string>("rfm");
  const [mappings, setMappings] = useState<Record<string, Record<string, string>>>({});

  const template = templates.find((t) => t.id === selectedTemplate)!;

  const getColumnsForType = (type: "date" | "numeric" | "categorical" | "any") => {
    if (type === "any") return columns;
    return columns.filter((col) => {
      if (type === "date") return columnTypes[col] === "date";
      if (type === "numeric") return columnTypes[col] === "numeric";
      return columnTypes[col] === "categorical";
    });
  };

  const currentMappings = mappings[selectedTemplate] || {};

  const updateMapping = (role: string, value: string) => {
    setMappings((prev) => ({
      ...prev,
      [selectedTemplate]: {
        ...(prev[selectedTemplate] || {}),
        [role]: value,
      },
    }));
  };

  const isComplete = template.requiredMappings.every((m) => currentMappings[m.role]);

  const generatedSQL = useMemo(() => {
    if (!isComplete) return "// Map all required columns to generate SQL";
    return template.generateSQL(currentMappings, tableName);
  }, [isComplete, currentMappings, template, tableName]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSQL);
    toast.success("SQL copied to clipboard");
  };

  const categoryColors: Record<string, string> = {
    segmentation: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    retention: "bg-green-500/10 text-green-500 border-green-500/30",
    growth: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    funnel: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    risk: "bg-red-500/10 text-red-500 border-red-500/30",
  };

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Behavioral SQL Templates</CardTitle>
          <CardDescription className="text-xs">
            Pre-built analytical patterns for common business metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto">
              {templates.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="text-xs py-2 gap-1">
                  <t.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.name.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Template Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <template.icon className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">{template.name}</CardTitle>
              </div>
              <Badge variant="outline" className={`text-[10px] ${categoryColors[template.category]}`}>
                {template.category}
              </Badge>
            </div>
            <CardDescription className="text-xs">{template.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.requiredMappings.map((req) => (
              <div key={req.role} className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  {req.description}
                  <Badge variant="outline" className="ml-2 text-[9px]">{req.type}</Badge>
                </label>
                <Select
                  value={currentMappings[req.role] || ""}
                  onValueChange={(v) => updateMapping(req.role, v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={`Select ${req.role}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getColumnsForType(req.type).map((col) => (
                      <SelectItem key={col} value={col} className="text-xs">
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Generated SQL Preview */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Generated SQL</CardTitle>
              <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={!isComplete}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className={`bg-secondary/50 border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-[350px] ${!isComplete ? "text-muted-foreground" : "text-foreground"}`}>
              {generatedSQL}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BehavioralTemplates;
