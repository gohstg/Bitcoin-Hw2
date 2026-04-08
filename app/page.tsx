import IndicatorChart from "../components/IndicatorChart";
import { headers } from "next/headers";

type DataPoint = {
  date: string;
  premium: number;
  btcPrice: number;
  stockPrice: number;
  marketCap: number;
  btcNav: number;
};

type IndicatorResponse = {
  company: string;
  indicator: string;
  assumptions: {
    btcHoldings: number;
    sharesOutstanding: number;
  };
  data: DataPoint[];
};

type SummaryResponse = {
  summary?: string;
  error?: string;
};

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host");

  if (!host) {
    throw new Error("Missing host header");
  }

  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function getIndicatorData(): Promise<IndicatorResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/indicator`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to load indicator data: ${errorText}`);
  }

  return res.json();
}

async function getSummaryData(): Promise<SummaryResponse> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/summary`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    return { error: errorText };
  }

  return res.json();
}

export default async function Home() {
  try {
    const result = await getIndicatorData();
    const summaryResult = await getSummaryData();

    const latest = result.data[result.data.length - 1];

    return (
      <main className="min-h-screen bg-gray-50 text-black p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-3">
            MSTR Premium to NAV Dashboard
          </h1>

          <p className="text-lg text-gray-700 mb-8">
            This website tracks the Premium to NAV of Strategy (MSTR) over time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h2 className="text-sm text-gray-500 mb-2">Latest BTC Price</h2>
              <p className="text-2xl font-semibold">
                $
                {latest.btcPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h2 className="text-sm text-gray-500 mb-2">Latest MSTR Price</h2>
              <p className="text-2xl font-semibold">
                $
                {latest.stockPrice.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <h2 className="text-sm text-gray-500 mb-2">Latest Premium to NAV</h2>
              <p className="text-2xl font-semibold">
                <span className={latest.premium > 0 ? "text-green-600" : "text-red-600"}>
                  {latest.premium.toFixed(2)}%
                </span>
              </p>
            </div>
          </div>

          <IndicatorChart data={result.data} />

          <div className="bg-white rounded-2xl shadow-sm border p-5 mt-8">
            <h2 className="text-xl font-semibold mb-3">AI-Generated Summary</h2>
            {summaryResult.summary ? (
              <p className="text-gray-700 leading-7 whitespace-pre-line">
                {summaryResult.summary}
              </p>
            ) : (
              <p className="text-red-600 text-sm">
                {summaryResult.error ?? "Summary unavailable."}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-5 mt-8">
            <h2 className="text-xl font-semibold mb-3">About This Indicator</h2>
            <p className="text-gray-700 leading-7">
              Premium to NAV compares Strategy’s market value with the value of its
              Bitcoin holdings.
            </p>
          </div>
        </div>
      </main>
    );
  } catch (error) {
    return (
      <main className="min-h-screen bg-gray-50 text-black p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">MSTR Premium to NAV Dashboard</h1>
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Error loading real data</h2>
            <pre className="whitespace-pre-wrap text-sm text-red-600">
              {error instanceof Error ? error.message : "Unknown error"}
            </pre>
          </div>
        </div>
      </main>
    );
  }
}