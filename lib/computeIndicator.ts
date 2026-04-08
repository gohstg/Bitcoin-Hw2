export type IndicatorPoint = {
  date: string;
  btcPrice: number;
  stockPrice: number;
  marketCap: number;
  btcNav: number;
  premium: number;
};

export function computePremiumToNav(
  stockPrice: number,
  sharesOutstanding: number,
  btcHoldings: number,
  btcPrice: number
) {
  const marketCap = stockPrice * sharesOutstanding;
  const btcNav = btcHoldings * btcPrice;
  const premium = ((marketCap - btcNav) / btcNav) * 100;

  return { marketCap, btcNav, premium };
}