/**
 * 給与所得控除額を計算（2020年以降の税制に対応）
 */
function calcSalaryDeduction(income) {
  if (income <= 1_625_000) return 550_000;
  if (income <= 1_800_000) return Math.floor(income * 0.4 - 100_000);
  if (income <= 3_600_000) return Math.floor(income * 0.3 + 80_000);
  if (income <= 6_600_000) return Math.floor(income * 0.2 + 440_000);
  if (income <= 8_500_000) return Math.floor(income * 0.1 + 1_100_000);
  return 1_950_000;
}

/**
 * 所得税の超過累進税率（7段階）
 */
function calcIncomeTax(taxableIncome) {
  const brackets = [
    { limit: 1_950_000, rate: 0.05, deduct: 0 },
    { limit: 3_300_000, rate: 0.10, deduct: 97_500 },
    { limit: 6_950_000, rate: 0.20, deduct: 427_500 },
    { limit: 9_000_000, rate: 0.23, deduct: 636_000 },
    { limit: 18_000_000, rate: 0.33, deduct: 1_536_000 },
    { limit: 40_000_000, rate: 0.40, deduct: 2_796_000 },
    { limit: Infinity, rate: 0.45, deduct: 4_796_000 },
  ];
  if (taxableIncome <= 0) return 0;
  const bracket = brackets.find(b => taxableIncome <= b.limit);
  return Math.floor(taxableIncome * bracket.rate - bracket.deduct);
}

/**
 * ふるさと納税の控除上限寄付額を計算
 * @param {Object} params
 * @param {number} params.income - 給与収入（円）
 * @param {boolean} params.married - 配偶者控除あり
 * @param {number} params.dependents - 扶養親族人数（16歳以上）
 * @param {boolean} params.hasDisability - 障害者控除あり
 * @param {boolean} params.isSingleParent - ひとり親控除あり
 * @param {number} params.medicalDeduction - 医療費控除額（10万円超の部分、円）
 * @returns {{ deductionLimit: number, details: Object }}
 */
export function calcFurusatoLimit({
  income = 0,
  married = false,
  dependents = 0,
  hasDisability = false,
  isSingleParent = false,
  medicalDeduction = 0,
}) {
  // 1. 給与所得
  const salaryDeduction = calcSalaryDeduction(income);
  const salaryIncome = income - salaryDeduction;

  // 2. 所得控除合計
  const basicDeduction = 480_000; // 基礎控除
  const marriedDeduction = married ? 380_000 : 0;
  const dependentDeduction = dependents * 380_000;
  const disabilityDeduction = hasDisability ? 270_000 : 0;
  const singleParentDeduction = isSingleParent ? 350_000 : 0;
  const totalDeductions =
    basicDeduction +
    marriedDeduction +
    dependentDeduction +
    disabilityDeduction +
    singleParentDeduction +
    medicalDeduction;

  // 3. 課税所得
  const taxableIncome = Math.max(0, salaryIncome - totalDeductions);

  // 4. 所得税額
  const incomeTax = calcIncomeTax(taxableIncome);

  // 5. 住民税所得割（10%）
  const residenceTax = Math.floor(taxableIncome * 0.1);

  // 6. 特例控除の上限 = 住民税所得割 × 20%
  const specialDeductionLimit = Math.floor(residenceTax * 0.2);

  // 7. 控除上限寄付額 = 特例控除上限 ÷ 0.9 + 2000円（自己負担）
  const deductionLimit = Math.floor(specialDeductionLimit / 0.9) + 2_000;

  return {
    deductionLimit,
    details: {
      salaryIncome,
      salaryDeduction,
      totalDeductions,
      taxableIncome,
      incomeTax,
      residenceTax,
      specialDeductionLimit,
    },
  };
}
