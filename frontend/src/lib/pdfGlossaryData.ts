export interface GlossaryTerm {
  term: string;
  meaning: string;
}

export interface GlossaryCategory {
  title: string;
  emoji: string;
  terms: GlossaryTerm[];
}

export interface WorkflowStage {
  number: number;
  emoji: string;
  title: string;
  subtitle: string;
  steps: string[];
  automated?: boolean;
}

export const glossaryCategories: GlossaryCategory[] = [
  {
    title: "Data Fundamentals",
    emoji: "🗄️",
    terms: [
      { term: "Dataset", meaning: "A collection of organized data, typically in rows and columns" },
      { term: "Variable", meaning: "Any characteristic or attribute being measured (e.g., Age, Revenue)" },
      { term: "Observation", meaning: "A single record or row in a dataset" },
      { term: "Dimension", meaning: "A categorical variable used to slice data (e.g., Region, Product)" },
      { term: "Metric / Measure", meaning: "A numerical value that is measured or calculated (e.g., Sales, Count)" },
      { term: "Granularity", meaning: "The level of detail in data — daily vs monthly vs yearly" },
      { term: "Schema", meaning: "The structure/blueprint of a database (tables, columns, data types)" },
      { term: "Data Type", meaning: "Format of a column — Integer, Float, String, Boolean, Date" },
      { term: "Cardinality", meaning: "Number of unique values in a column" },
      { term: "Null / Missing Value", meaning: "An empty or absent data point in a record" },
      { term: "Duplicate", meaning: "Repeated identical records in a dataset" },
      { term: "Raw Data", meaning: "Unprocessed, original data before any cleaning" },
      { term: "Structured Data", meaning: "Data in rows/columns format (CSV, Excel, SQL tables)" },
      { term: "Unstructured Data", meaning: "Data without fixed format (text, images, audio, PDFs)" },
      { term: "Semi-structured Data", meaning: "Partially organized data (JSON, XML, logs)" },
    ],
  },
  {
    title: "Data Cleaning",
    emoji: "🧹",
    terms: [
      { term: "Data Wrangling", meaning: "The process of cleaning and transforming raw data" },
      { term: "Imputation", meaning: "Filling in missing values using mean, median, mode, or AI" },
      { term: "Outlier", meaning: "A data point significantly different from the rest" },
      { term: "Normalization", meaning: "Scaling data to a 0–1 range" },
      { term: "Standardization", meaning: "Scaling data to have mean=0 and std=1 (Z-score)" },
      { term: "Deduplication", meaning: "Removing duplicate records from a dataset" },
      { term: "Data Validation", meaning: "Checking if data meets expected rules and formats" },
      { term: "Type Casting", meaning: "Converting a column from one data type to another" },
      { term: "Feature Engineering", meaning: "Creating new columns from existing ones to improve analysis" },
      { term: "Binning", meaning: "Grouping continuous values into ranges (e.g., Age → 0–18, 19–35)" },
      { term: "Encoding", meaning: "Converting categorical values to numbers (One-Hot, Label Encoding)" },
      { term: "Data Profiling", meaning: "Summarizing data to understand its structure and quality" },
    ],
  },
  {
    title: "Exploratory Data Analysis (EDA)",
    emoji: "📊",
    terms: [
      { term: "EDA", meaning: "Exploratory Data Analysis — initial investigation of data" },
      { term: "Distribution", meaning: "How values are spread across a range" },
      { term: "Mean", meaning: "Average of all values" },
      { term: "Median", meaning: "Middle value when sorted" },
      { term: "Mode", meaning: "Most frequently occurring value" },
      { term: "Variance", meaning: "Measure of how spread out values are" },
      { term: "Standard Deviation", meaning: "Square root of variance — average distance from the mean" },
      { term: "Skewness", meaning: "How asymmetric a distribution is (left/right skewed)" },
      { term: "Kurtosis", meaning: "How heavy the tails of a distribution are" },
      { term: "Percentile / Quantile", meaning: "Value below which X% of data falls (e.g., 75th percentile)" },
      { term: "IQR", meaning: "Interquartile Range — range between 25th and 75th percentile" },
      { term: "Correlation", meaning: "Relationship strength between two variables (-1 to +1)" },
      { term: "Heatmap", meaning: "Color-coded matrix showing correlation between all columns" },
      { term: "Histogram", meaning: "Chart showing frequency distribution of a numeric column" },
      { term: "Box Plot", meaning: "Visual summary of min, Q1, median, Q3, max and outliers" },
    ],
  },
  {
    title: "SQL & Database",
    emoji: "🗃️",
    terms: [
      { term: "Query", meaning: "A request to retrieve or manipulate data from a database" },
      { term: "SELECT", meaning: "SQL command to fetch data" },
      { term: "WHERE", meaning: "SQL clause to filter rows by condition" },
      { term: "GROUP BY", meaning: "SQL clause to aggregate data by category" },
      { term: "JOIN", meaning: "Combining two or more tables based on a common column" },
      { term: "INNER JOIN", meaning: "Returns only matching rows from both tables" },
      { term: "LEFT JOIN", meaning: "Returns all rows from left table + matching from right" },
      { term: "PRIMARY KEY", meaning: "Unique identifier column for each row in a table" },
      { term: "FOREIGN KEY", meaning: "Column that links one table to another" },
      { term: "Aggregate Functions", meaning: "COUNT, SUM, AVG, MIN, MAX — summarize data" },
      { term: "Subquery", meaning: "A query nested inside another query" },
      { term: "CTE", meaning: "Common Table Expression — temporary named result set (WITH clause)" },
      { term: "Window Function", meaning: "Calculations across rows related to the current row (RANK, ROW_NUMBER, LAG)" },
      { term: "Index", meaning: "Database structure to speed up queries" },
      { term: "View", meaning: "A saved SQL query that acts like a virtual table" },
    ],
  },
  {
    title: "Statistics & Probability",
    emoji: "📈",
    terms: [
      { term: "Hypothesis", meaning: "A claim or assumption being tested" },
      { term: "Null Hypothesis (H0)", meaning: "The default assumption — no effect or no difference" },
      { term: "Alternative Hypothesis (H1)", meaning: "The claim you're trying to prove" },
      { term: "p-value", meaning: "Probability of observing your result if H0 is true — below 0.05 = significant" },
      { term: "Statistical Significance", meaning: "Result is unlikely due to chance (p < 0.05)" },
      { term: "Confidence Interval", meaning: "Range in which the true value lies with X% confidence" },
      { term: "A/B Testing", meaning: "Comparing two versions to see which performs better" },
      { term: "Chi-Square Test", meaning: "Tests relationship between two categorical variables" },
      { term: "T-Test", meaning: "Tests if means of two groups are significantly different" },
      { term: "ANOVA", meaning: "Tests difference in means across 3+ groups" },
      { term: "Regression", meaning: "Predicts a numeric output from input variables" },
      { term: "R-squared (R²)", meaning: "How well a regression model explains variance (0–1)" },
      { term: "Bias", meaning: "Systematic error in data or model" },
      { term: "Overfitting", meaning: "Model is too fitted to training data — fails on new data" },
      { term: "Underfitting", meaning: "Model is too simple — fails to capture patterns" },
    ],
  },
  {
    title: "Machine Learning",
    emoji: "🤖",
    terms: [
      { term: "Supervised Learning", meaning: "Model trained on labeled data (input → known output)" },
      { term: "Unsupervised Learning", meaning: "Model finds patterns in unlabeled data" },
      { term: "Classification", meaning: "Predicting a category (Yes/No, Fraud/Not Fraud)" },
      { term: "Regression (ML)", meaning: "Predicting a continuous number (Price, Sales)" },
      { term: "Clustering", meaning: "Grouping similar data points together (K-Means)" },
      { term: "Feature", meaning: "An input variable used to train a model" },
      { term: "Target / Label", meaning: "The output variable the model predicts" },
      { term: "Train / Test Split", meaning: "Dividing data into training set and evaluation set" },
      { term: "Cross Validation", meaning: "Testing model performance across multiple data splits" },
      { term: "Confusion Matrix", meaning: "Table showing correct vs incorrect model predictions" },
      { term: "Precision", meaning: "Of all predicted positives, how many were actually positive" },
      { term: "Recall", meaning: "Of all actual positives, how many were correctly predicted" },
      { term: "F1 Score", meaning: "Harmonic mean of Precision and Recall" },
      { term: "ROC-AUC", meaning: "Curve measuring model's discrimination ability" },
      { term: "Feature Importance", meaning: "Which variables have the most impact on predictions" },
    ],
  },
  {
    title: "Business & KPI",
    emoji: "📉",
    terms: [
      { term: "KPI", meaning: "Key Performance Indicator — measurable value showing progress toward a goal" },
      { term: "YTD", meaning: "Year to Date — cumulative value from January 1st to today" },
      { term: "MTD", meaning: "Month to Date — cumulative value from start of month to today" },
      { term: "YoY", meaning: "Year over Year — comparison vs the same period last year" },
      { term: "MoM", meaning: "Month over Month — comparison vs the previous month" },
      { term: "CAGR", meaning: "Compound Annual Growth Rate — steady growth rate over years" },
      { term: "Churn Rate", meaning: "Percentage of customers who stop using a product" },
      { term: "CLV", meaning: "Customer Lifetime Value — total expected revenue from a customer" },
      { term: "CAC", meaning: "Customer Acquisition Cost — cost to acquire one new customer" },
      { term: "Conversion Rate", meaning: "Percentage of users who complete a desired action" },
      { term: "Funnel Analysis", meaning: "Tracking user drop-off at each stage of a process" },
      { term: "Cohort Analysis", meaning: "Analyzing behavior of groups sharing a common trait" },
      { term: "Retention Rate", meaning: "Percentage of customers who continue using a product" },
      { term: "ROI", meaning: "Return on Investment — profit relative to cost" },
      { term: "Benchmark", meaning: "A standard reference point to compare performance against" },
    ],
  },
];

export const workflowStages: WorkflowStage[] = [
  {
    number: 1, emoji: "🎯", title: "Define the Problem",
    subtitle: "Business Question → Analytical Question → Success Metric",
    steps: [
      "Understand what decision needs to be made",
      "Identify what data is needed to answer it",
      "Define what 'good answer' looks like",
      "Set KPIs to measure",
    ],
  },
  {
    number: 2, emoji: "🗂️", title: "Data Collection",
    subtitle: "Identify Sources → Extract Data → Load into workspace",
    steps: [
      "Pull data from databases (SQL queries)",
      "Export from CRM, ERP, Google Analytics, etc.",
      "Receive CSV/Excel files from teams",
      "Connect to APIs or data warehouses",
    ],
  },
  {
    number: 3, emoji: "🧹", title: "Data Cleaning",
    subtitle: "Raw Data → Profile → Clean → Validate → Clean Dataset",
    steps: [
      "Profile the data — check shape, data types, nulls, duplicates",
      "Handle missing values — drop, impute, or flag",
      "Remove duplicates — deduplicate records",
      "Fix data types — convert strings to dates, numbers to floats",
      "Standardize formats — consistent date formats, text casing",
      "Handle outliers — cap, remove, or investigate",
      "Validate — check business rules (e.g., Age can't be negative)",
    ],
    automated: true,
  },
  {
    number: 4, emoji: "🔍", title: "Exploratory Data Analysis (EDA)",
    subtitle: "Clean Data → Understand Distributions → Find Patterns → Generate Hypotheses",
    steps: [
      "Univariate analysis — analyze each column individually",
      "Bivariate analysis — relationships between two variables",
      "Multivariate analysis — interactions among multiple variables",
      "Correlation matrix — identify which variables move together",
      "Segmentation — break data by dimensions",
      "Time trend analysis — identify seasonality, growth, decline",
      "Anomaly spotting — flag unusual patterns or spikes",
    ],
    automated: true,
  },
  {
    number: 5, emoji: "📐", title: "Statistical Analysis",
    subtitle: "Observation → Hypothesis → Test → Accept or Reject",
    steps: [
      "Form a hypothesis from EDA observations",
      "Choose the right test (T-Test, Chi-Square, ANOVA, A/B Test)",
      "Set significance threshold (p < 0.05)",
      "Run the test",
      "Interpret p-value and confidence intervals",
      "Draw conclusions",
    ],
    automated: true,
  },
  {
    number: 6, emoji: "🤖", title: "Modeling",
    subtitle: "Features → Train Model → Evaluate → Tune → Final Model",
    steps: [
      "Define target variable — what are you predicting?",
      "Feature selection — choose relevant input columns",
      "Train/test split — usually 80/20",
      "Select algorithm — Linear Regression, Random Forest, XGBoost",
      "Train and evaluate — Accuracy, R², RMSE, F1 Score",
      "Hyperparameter tuning — optimize model settings",
      "Final validation — test on unseen data",
    ],
    automated: true,
  },
  {
    number: 7, emoji: "📊", title: "Data Visualization",
    subtitle: "Insights → Choose Right Chart → Build → Refine → Dashboard",
    steps: [
      "Compare categories → Bar Chart",
      "Show trend over time → Line Chart",
      "Show part of a whole → Pie / Donut Chart",
      "Show distribution → Histogram / Box Plot",
      "Show relationship → Scatter Plot",
      "Show correlation matrix → Heatmap",
      "Show flow between stages → Sankey / Funnel",
    ],
    automated: true,
  },
  {
    number: 8, emoji: "📝", title: "Reporting & Communication",
    subtitle: "Insights → Structure Story → Build Report → Present → Act",
    steps: [
      "Structure the narrative — Problem → Finding → Recommendation",
      "Write executive summary — key takeaways in 3–5 bullet points",
      "Build the report — charts, tables, commentary",
      "Tailor to audience — technical for data team, visual for executives",
      "Present findings — walk stakeholders through insights",
      "Answer 'So what?' — every insight needs a business recommendation",
    ],
    automated: true,
  },
  {
    number: 9, emoji: "🔁", title: "Monitor & Iterate",
    subtitle: "Deploy Insight → Track Impact → Refresh Data → Update Report",
    steps: [
      "Set up scheduled dashboard refresh",
      "Track if recommendations were implemented",
      "Measure if KPIs improved",
      "Refine analysis as new data arrives",
    ],
  },
];

export const chartSelectionGuide = [
  { useCase: "Compare categories", chartType: "Bar Chart" },
  { useCase: "Show trend over time", chartType: "Line Chart" },
  { useCase: "Show part of a whole", chartType: "Pie / Donut Chart" },
  { useCase: "Show distribution", chartType: "Histogram / Box Plot" },
  { useCase: "Show relationship", chartType: "Scatter Plot" },
  { useCase: "Show correlation matrix", chartType: "Heatmap" },
  { useCase: "Show flow between stages", chartType: "Sankey / Funnel" },
  { useCase: "Show geography", chartType: "Map / Choropleth" },
];
