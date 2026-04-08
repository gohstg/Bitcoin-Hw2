import { NextResponse } from "next/server";

const BTC_HOLDINGS = 766970;
const SHARES_OUTSTANDING = 293_998_000;

type MarketstackResponse = {
  data?: Array<{
    date: string;
    close: number;
    symbol: string;
    exchange?: string;
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};

type CoinGeckoResponse = {
  prices?: [number, number][];
};

function computePremiumToNav(
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

export async function GET() {
  const marketstackKey = process.env.MARKETSTACK_API_KEY;

  if (!marketstackKey) {
    return NextResponse.json(
      { error: "Missing MARKETSTACK_API_KEY" },
      { status: 500 }
    );
  }

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 90);

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const stockUrl =
    `https://api.marketstack.com/v1/eod` +
    `?access_key=${marketstackKey}` +
    `&symbols=MSTR` +
    `&date_from=${startDate}` +
    `&date_to=${endDate}` +
    `&limit=100`;

  const btcUrl =
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart` +
    `?vs_currency=usd&days=90`;

  let stockJson: MarketstackResponse;
  let btcJson: CoinGeckoResponse;

  try {
    const stockRes = await fetch(stockUrl, { cache: "no-store" });
    stockJson = await stockRes.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: "Marketstack fetch failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stockUrl,
      },
      { status: 500 }
    );
  }

  try {
    const btcRes = await fetch(btcUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    btcJson = await btcRes.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: "CoinGecko fetch failed",
        details: error instanceof Error ? error.message : "Unknown error",
        btcUrl,
      },
      { status: 500 }
    );
  }

  if (stockJson.error) {
    return NextResponse.json(
      { error: "Marketstack stock request failed", stockJson },
      { status: 500 }
    );
  }

  if (!stockJson.data || !stockJson.data.length) {
    return NextResponse.json(
      { error: "Marketstack returned no stock data", stockJson },
      { status: 500 }
    );
  }

  if (!btcJson.prices || !Array.isArray(btcJson.prices)) {
    return NextResponse.json(
      { error: "CoinGecko BTC response invalid", btcJson },
      { status: 500 }
    );
  }

  const stockMap = new Map<string, number>();
  for (const row of stockJson.data) {
    const date = row.date.slice(0, 10);
    stockMap.set(date, Number(row.close));
  }

  const btcMap = new Map<string, number>();
  for (const [timestamp, price] of btcJson.prices) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    btcMap.set(date, Number(price));
  }

  const allDates = [...stockMap.keys()]
    .filter((date) => btcMap.has(date))
    .sort((a, b) => a.localeCompare(b));

  const data = allDates
    .map((date) => {
      const stockPrice = stockMap.get(date);
      const btcPrice = btcMap.get(date);

      if (!stockPrice || !btcPrice) return null;

      const { marketCap, btcNav, premium } = computePremiumToNav(
        stockPrice,
        SHARES_OUTSTANDING,
        BTC_HOLDINGS,
        btcPrice
      );

      return {
        date,
        btcPrice,
        stockPrice,
        marketCap,
        btcNav,
        premium,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({
    company: "MSTR",
    indicator: "Premium to NAV",
    assumptions: {
      btcHoldings: BTC_HOLDINGS,
      sharesOutstanding: SHARES_OUTSTANDING,
    },
    data,
  });
}