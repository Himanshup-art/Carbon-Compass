import {
  BreakdownItem,
  CalculationResult,
  CarbonFormValues,
  DietType,
  Suggestion,
  TravelMode
} from "@/lib/types";

const NATIONAL_AVERAGE_KG = 1900;
const GLOBAL_AVERAGE_KG = 4000;

const TRAVEL_FACTORS: Record<TravelMode, number> = {
  car: 0.21,
  bike: 0.1,
  bus: 0.08,
  train: 0.04,
  flight: 0.18
};

const DIET_BASELINES: Record<DietType, number> = {
  vegan: 1400,
  vegetarian: 1700,
  nonVegetarian: 2500
};

export function sanitizeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getMonthKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export function validateCarbonForm(payload: Partial<CarbonFormValues>) {
  const issues: string[] = [];

  if (!payload.profileId?.trim()) issues.push("Profile id is required.");
  if (!payload.name?.trim()) issues.push("Name is required.");
  if (!payload.email?.trim()) issues.push("Email is required.");
  if (!payload.travelMode) issues.push("Travel mode is required.");
  if (!payload.dietType) issues.push("Diet type is required.");

  const dailyTravelKm = sanitizeNumber(Number(payload.dailyTravelKm));
  const monthlyElectricityUnits = sanitizeNumber(Number(payload.monthlyElectricityUnits));
  const weeklyMeatMeals = sanitizeNumber(Number(payload.weeklyMeatMeals));
  const targetReductionPercent = sanitizeNumber(Number(payload.targetReductionPercent));

  if (dailyTravelKm > 500) issues.push("Daily travel distance looks too high.");
  if (monthlyElectricityUnits > 5000) issues.push("Monthly electricity units look too high.");
  if (weeklyMeatMeals > 35) issues.push("Weekly meat meals should be realistic.");
  if (targetReductionPercent > 100) issues.push("Reduction target cannot exceed 100%.");

  return issues;
}

function buildBreakdown(values: CarbonFormValues): BreakdownItem[] {
  const annualTravelKg = values.dailyTravelKm * 365 * TRAVEL_FACTORS[values.travelMode];
  const annualElectricityKg = values.monthlyElectricityUnits * 12 * 0.82;
  const dietBase = DIET_BASELINES[values.dietType];
  const annualFoodKg =
    values.dietType === "nonVegetarian"
      ? dietBase + values.weeklyMeatMeals * 52 * 4
      : dietBase + values.weeklyMeatMeals * 52 * 1.5;

  const total = annualTravelKg + annualElectricityKg + annualFoodKg;

  return [
    { key: "travel", label: "Travel", annualKg: annualTravelKg, share: total ? annualTravelKg / total : 0 },
    {
      key: "electricity",
      label: "Electricity",
      annualKg: annualElectricityKg,
      share: total ? annualElectricityKg / total : 0
    },
    { key: "food", label: "Food", annualKg: annualFoodKg, share: total ? annualFoodKg / total : 0 }
  ];
}

function buildSuggestions(values: CarbonFormValues, breakdown: BreakdownItem[]): Suggestion[] {
  const largest = [...breakdown].sort((a, b) => b.annualKg - a.annualKg)[0];

  const common: Suggestion[] = [
    {
      title: "Track one update every month",
      description:
        "Consistency matters more than perfection. Re-enter your data monthly to see if your habits are improving.",
      estimatedSavingsKg: 120,
      focus: "travel"
    }
  ];

  const focused: Record<BreakdownItem["key"], Suggestion[]> = {
    travel: [
      {
        title: "Shift 3 commute days to bus or train",
        description:
          "Replacing solo car trips with shared transport sharply cuts emissions without changing your whole routine.",
        estimatedSavingsKg: Math.round(values.dailyTravelKm * 0.11 * 156),
        focus: "travel"
      },
      {
        title: "Combine errands into fewer trips",
        description: "Shorter weekly travel distance lowers both fuel use and your yearly footprint.",
        estimatedSavingsKg: Math.round(values.dailyTravelKm * 0.08 * 52),
        focus: "travel"
      }
    ],
    electricity: [
      {
        title: "Reduce AC and fan runtime by 10%",
        description: "A small reduction in appliance hours can save a visible amount over the year.",
        estimatedSavingsKg: Math.round(values.monthlyElectricityUnits * 12 * 0.1 * 0.82),
        focus: "electricity"
      },
      {
        title: "Switch to efficient lighting and standby control",
        description: "LEDs and turning devices fully off bring easy recurring savings.",
        estimatedSavingsKg: 140,
        focus: "electricity"
      }
    ],
    food: [
      {
        title: "Cut 2 meat meals each week",
        description:
          "Even a partial reduction in meat consumption can noticeably reduce food-related emissions.",
        estimatedSavingsKg: 208,
        focus: "food"
      },
      {
        title: "Add more seasonal local food",
        description: "Local and seasonal choices usually reduce transport and storage impact.",
        estimatedSavingsKg: 110,
        focus: "food"
      }
    ]
  };

  return [...focused[largest.key], ...common].sort((a, b) => b.estimatedSavingsKg - a.estimatedSavingsKg);
}

export function calculateCarbonFootprint(values: CarbonFormValues): CalculationResult {
  const breakdown = buildBreakdown(values);
  const totalAnnualKg = breakdown.reduce((sum, item) => sum + item.annualKg, 0);
  const totalAnnualTonnes = totalAnnualKg / 1000;
  const rating =
    totalAnnualKg < NATIONAL_AVERAGE_KG ? "green" : totalAnnualKg <= GLOBAL_AVERAGE_KG ? "amber" : "red";
  const ratingLabel =
    rating === "green" ? "Below average" : rating === "amber" ? "Needs improvement" : "High impact";
  const headline =
    rating === "green"
      ? "Your lifestyle footprint is below the national average — great work!"
      : rating === "amber"
        ? "You are around the average. A few targeted changes can lower it quickly."
        : "Your annual carbon impact is high and deserves focused action.";
  const targetAnnualKg = Math.max(0, totalAnnualKg * (1 - values.targetReductionPercent / 100));
  const monthlyProjectionKg = totalAnnualKg / 12;

  return {
    totalAnnualKg: round(totalAnnualKg),
    totalAnnualTonnes: round(totalAnnualTonnes, 2),
    nationalAverageKg: NATIONAL_AVERAGE_KG,
    globalAverageKg: GLOBAL_AVERAGE_KG,
    rating,
    ratingLabel,
    headline,
    breakdown: breakdown.map((item) => ({
      ...item,
      annualKg: round(item.annualKg),
      share: round(item.share * 100, 1)
    })),
    suggestions: buildSuggestions(values, breakdown),
    targetAnnualKg: round(targetAnnualKg),
    monthlyProjectionKg: round(monthlyProjectionKg)
  };
}

function round(value: number, precision = 0) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
