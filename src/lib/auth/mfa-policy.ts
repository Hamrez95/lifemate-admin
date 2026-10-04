export type TotpFactorSnapshot = Readonly<{
  id: string;
  status: string;
}>;

export function getVerifiedTotpFactors<T extends TotpFactorSnapshot>(
  factors: readonly T[] | null | undefined,
): T[] {
  return (factors ?? []).filter((factor) => factor.status === "verified");
}

export function isLastVerifiedTotpFactor(
  factors: readonly TotpFactorSnapshot[] | null | undefined,
  factorId: string,
): boolean {
  const verifiedFactors = getVerifiedTotpFactors(factors);
  return verifiedFactors.length === 1 && verifiedFactors[0]?.id === factorId;
}
