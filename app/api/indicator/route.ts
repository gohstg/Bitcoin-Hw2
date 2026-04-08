import { NextResponse } from "next/server";

const BTC_HOLDINGS = 766970;
const SHARES_OUTSTANDING = 293_998_000;

type StockResponse = {
  ["Time Series (Daily)"]?: Record<
    string,
    {
      ["4. close"]?: string;
    }
  >;
  Information?: string;
  Note?: string;
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
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ALPHA_VANTAGE_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const stockUrl =
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY` +
      `&symbol=MSTR&outputsize=compact&apikey=${apiKey}`;

    const end = Date.now();
    const start = end - 90 * 24 * 60 * 60 * 1000;

    const btcUrl =
      `https://api.binance.com/api/v3/klines` +
      `?symbol=BTCUSDT&interval=1d&startTime=${start}&endTime=${end}&limit=1000`;

    const [stockRes, btcRes] = await Promise.all([
      fetch(stockUrl, { cache: "no-store" }),
      fetch(btcUrl, { cache: "no-store" }),
    ]);

    const stockJson: StockResponse = await stockRes.json();
    const btcJson = await btcRes.json();

    if (stockJson.Information || stockJson.Note) {
      return NextResponse.json(
        { error: "Alpha stock request failed", stockJson },
        { status: 500 }
      );
    }

    const stockSeries = stockJson["Time Series (Daily)"];

    if (!stockSeries) {
      return NextResponse.json(
        { error: "Stock response missing daily series", stockJson },
        { status: 500 }
      );
    }

    if (!Array.isArray(btcJson)) {
      return NextResponse.json(
        { error: "BTC response is not an array", btcJson },
        { status: 500 }
      );
    }

    const btcMap = new Map<string, number>();

    for (const row of btcJson) {
      // Binance kline format:
      // [ openTime, open, high, low, close, volume, closeTime, ... ]
      const openTime = row[0];
      const closePrice = Number(row[4]);

      const date = new Date(openTime).toISOString().slice(0, 10);
      btcMap.set(date, closePrice);
    }

    const data = Object.entries(stockSeries)
      .map(([date, stockValues]) => {
        const btcPrice = btcMap.get(date);
        const stockPrice = Number(stockValues["4. close"] ?? 0);

        if (!btcPrice || !stockPrice) return null;

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
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      company: "MSTR",
      indicator: "Premium to NAV",
      assumptions: {
        btcHoldings: BTC_HOLDINGS,
        sharesOutstanding: SHARES_OUTSTANDING,
      },
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}