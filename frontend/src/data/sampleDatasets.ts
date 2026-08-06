// Sample datasets for onboarding and demos

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  rowCount: number;
  columns: string[];
  data: Record<string, unknown>[];
}

// Sales Dataset - 500 rows
const generateSalesData = (): Record<string, unknown>[] => {
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const products = ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Device Z', 'Tool Pro'];
  const categories = ['Electronics', 'Hardware', 'Software', 'Services'];
  const salesReps = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Eva Martinez'];
  
  return Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    product: products[Math.floor(Math.random() * products.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    region: regions[Math.floor(Math.random() * regions.length)],
    salesRep: salesReps[Math.floor(Math.random() * salesReps.length)],
    quantity: Math.floor(Math.random() * 100) + 1,
    unitPrice: Math.round((Math.random() * 200 + 10) * 100) / 100,
    revenue: 0,
    discount: Math.round(Math.random() * 20 * 100) / 100,
    profit: 0,
  })).map(row => ({
    ...row,
    revenue: Math.round((row.quantity as number) * (row.unitPrice as number) * 100) / 100,
    profit: Math.round((row.quantity as number) * (row.unitPrice as number) * (0.2 + Math.random() * 0.3) * 100) / 100,
  }));
};

// Customer Analytics Dataset - 300 rows
const generateCustomerData = (): Record<string, unknown>[] => {
  const segments = ['Premium', 'Standard', 'Basic', 'Enterprise'];
  const industries = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing'];
  const countries = ['USA', 'UK', 'Germany', 'France', 'Canada', 'Australia'];
  const statuses = ['Active', 'Inactive', 'Churned', 'New'];
  
  return Array.from({ length: 300 }, (_, i) => ({
    customerId: `CUST-${String(i + 1).padStart(4, '0')}`,
    companyName: `Company ${i + 1}`,
    segment: segments[Math.floor(Math.random() * segments.length)],
    industry: industries[Math.floor(Math.random() * industries.length)],
    country: countries[Math.floor(Math.random() * countries.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    totalPurchases: Math.floor(Math.random() * 50) + 1,
    lifetimeValue: Math.round((Math.random() * 100000 + 1000) * 100) / 100,
    acquisitionDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    lastPurchaseDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    satisfactionScore: Math.round((Math.random() * 5 + 5) * 10) / 10,
    npsScore: Math.floor(Math.random() * 11) - 5 + 5,
  }));
};

// Stock Prices Dataset - 1000 rows
const generateStockData = (): Record<string, unknown>[] => {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'];
  const data: Record<string, unknown>[] = [];
  
  symbols.forEach(symbol => {
    let basePrice = 100 + Math.random() * 200;
    for (let day = 0; day < 200; day++) {
      const date = new Date(2024, 0, 1);
      date.setDate(date.getDate() + day);
      
      const volatility = (Math.random() - 0.5) * 0.1;
      basePrice = Math.max(50, basePrice * (1 + volatility));
      
      const open = Math.round(basePrice * (1 + (Math.random() - 0.5) * 0.02) * 100) / 100;
      const close = Math.round(basePrice * 100) / 100;
      const high = Math.round(Math.max(open, close) * (1 + Math.random() * 0.02) * 100) / 100;
      const low = Math.round(Math.min(open, close) * (1 - Math.random() * 0.02) * 100) / 100;
      
      data.push({
        date: date.toISOString().split('T')[0],
        symbol,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        change: Math.round((close - open) * 100) / 100,
        changePercent: Math.round(((close - open) / open) * 10000) / 100,
      });
    }
  });
  
  return data;
};

// Survey Results Dataset - 200 rows
const generateSurveyData = (): Record<string, unknown>[] => {
  const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const educationLevels = ['High School', 'Some College', 'Bachelor\'s', 'Master\'s', 'Doctorate'];
  const employmentStatuses = ['Full-time', 'Part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired'];
  const satisfactionLevels = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];
  
  return Array.from({ length: 200 }, (_, i) => ({
    respondentId: i + 1,
    ageGroup: ageGroups[Math.floor(Math.random() * ageGroups.length)],
    education: educationLevels[Math.floor(Math.random() * educationLevels.length)],
    employment: employmentStatuses[Math.floor(Math.random() * employmentStatuses.length)],
    income: Math.floor(Math.random() * 150000) + 20000,
    productSatisfaction: satisfactionLevels[Math.floor(Math.random() * satisfactionLevels.length)],
    serviceSatisfaction: satisfactionLevels[Math.floor(Math.random() * satisfactionLevels.length)],
    recommendScore: Math.floor(Math.random() * 11),
    usageFrequency: ['Daily', 'Weekly', 'Monthly', 'Rarely'][Math.floor(Math.random() * 4)],
    feedbackLength: Math.floor(Math.random() * 500) + 10,
    submissionDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
  }));
};

// Large Performance Test Dataset - 100K rows
const generateLargeDataset = (): Record<string, unknown>[] => {
  return Array.from({ length: 100000 }, (_, i) => ({
    id: i + 1,
    timestamp: new Date(2024, 0, 1, Math.floor(i / 4000), (i % 4000) % 60, i % 60).toISOString(),
    metric: ['CPU', 'Memory', 'Disk', 'Network'][Math.floor(Math.random() * 4)],
    value: Math.round(Math.random() * 100 * 100) / 100,
    host: `server-${Math.floor(Math.random() * 50) + 1}`,
    region: ['us-east', 'us-west', 'eu-west', 'ap-south'][Math.floor(Math.random() * 4)],
    status: Math.random() > 0.95 ? 'alert' : 'normal',
  }));
};

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'sales',
    name: 'Sales Analytics',
    description: 'E-commerce sales data with products, regions, and revenue',
    rowCount: 500,
    columns: ['id', 'date', 'product', 'category', 'region', 'salesRep', 'quantity', 'unitPrice', 'revenue', 'discount', 'profit'],
    data: generateSalesData(),
  },
  {
    id: 'customers',
    name: 'Customer Analytics',
    description: 'Customer segmentation data with lifetime value metrics',
    rowCount: 300,
    columns: ['customerId', 'companyName', 'segment', 'industry', 'country', 'status', 'totalPurchases', 'lifetimeValue', 'acquisitionDate', 'lastPurchaseDate', 'satisfactionScore', 'npsScore'],
    data: generateCustomerData(),
  },
  {
    id: 'stocks',
    name: 'Stock Prices',
    description: 'Historical stock prices with OHLCV data',
    rowCount: 1000,
    columns: ['date', 'symbol', 'open', 'high', 'low', 'close', 'volume', 'change', 'changePercent'],
    data: generateStockData(),
  },
  {
    id: 'survey',
    name: 'Survey Results',
    description: 'Customer satisfaction survey responses',
    rowCount: 200,
    columns: ['respondentId', 'ageGroup', 'education', 'employment', 'income', 'productSatisfaction', 'serviceSatisfaction', 'recommendScore', 'usageFrequency', 'feedbackLength', 'submissionDate'],
    data: generateSurveyData(),
  },
  {
    id: 'performance',
    name: 'Performance Metrics (100K)',
    description: 'Large dataset for testing virtual scrolling - 100,000 rows',
    rowCount: 100000,
    columns: ['id', 'timestamp', 'metric', 'value', 'host', 'region', 'status'],
    data: [], // Generated on demand due to size
  },
];

// Generate large dataset on demand
export const getLargeDataset = (): SampleDataset => {
  return {
    ...SAMPLE_DATASETS[4],
    data: generateLargeDataset(),
  };
};

export const getSampleDataset = (id: string): SampleDataset | undefined => {
  if (id === 'performance') {
    return getLargeDataset();
  }
  return SAMPLE_DATASETS.find(d => d.id === id);
};
