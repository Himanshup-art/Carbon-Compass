export type TravelMode = "car" | "bike" | "bus" | "train" | "flight";
export type DietType = "vegan" | "vegetarian" | "nonVegetarian";
export type Rating = "green" | "amber" | "red";

export type CarbonFormValues = {
  profileId: string;
  name: string;
  email: string;
  travelMode: TravelMode;
  dailyTravelKm: number;
  monthlyElectricityUnits: number;
  dietType: DietType;
  weeklyMeatMeals: number;
  targetReductionPercent: number;
};

export type BreakdownItem = {
  key: "travel" | "electricity" | "food";
  label: string;
  annualKg: number;
  share: number;
};

export type Suggestion = {
  title: string;
  description: string;
  estimatedSavingsKg: number;
  focus: BreakdownItem["key"];
};

export type CalculationResult = {
  totalAnnualKg: number;
  totalAnnualTonnes: number;
  indiaAverageKg: number;
  globalAverageKg: number;
  rating: Rating;
  ratingLabel: string;
  headline: string;
  breakdown: BreakdownItem[];
  suggestions: Suggestion[];
  targetAnnualKg: number;
  monthlyProjectionKg: number;
};

export type CarbonEntryRecord = CarbonFormValues & {
  id: string;
  createdAt: string;
  monthKey: string;
  calculation: CalculationResult;
};

export type MonthlyTrendPoint = {
  monthKey: string;
  totalAnnualKg: number;
};

export type CarbonDashboardResponse = {
  latestEntry: CarbonEntryRecord | null;
  history: CarbonEntryRecord[];
  trend: MonthlyTrendPoint[];
};
