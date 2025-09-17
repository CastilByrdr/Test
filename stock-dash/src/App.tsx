import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY; // put your key in .env

const SYMBOLS = ["MSFT", "AAPL", "GOOGL", "AMZN", "TSLA"];

export default function App() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("MSFT");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stock quotes
  const fetchStocks = async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        SYMBOLS.map(async (symbol) => {
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
          );
          const data = await res.json();

          if (data.Note) {
            throw new Error("API limit reached. Please wait a minute.");
          }
          return data["Global Quote"];
        })
      );

      setStocks(results.filter(Boolean));
    } catch (err: any) {
      setError(err.message || "Failed to fetch stocks");
    } finally {
      setLoading(false);
    }
  };

  // Fetch chart data
  const fetchChart = async (symbol: string) => {
    setChartData([]);
    try {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=compact&apikey=${API_KEY}`
      );
      const data = await res.json();

      if (data.Note) {
        setError("API limit reached. Please wait a minute.");
        return;
      }

      const series = data["Time Series (Daily)"];
      if (!series) return;

      const parsed = Object.keys(series)
        .slice(0, 60) // last 60 days
        .map((date) => ({
          date,
          close: parseFloat(series[date]["4. close"]),
        }))
        .reverse();

      setChartData(parsed);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    if (selected) fetchChart(selected);
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">📈 Stock Price Dashboard</h1>

      {error && <p className="text-red-500 mb-2">{error}</p>}
      {loading && <p className="text-gray-500 mb-2">Loading...</p>}

      {/* Stock Table */}
      <table className="min-w-full bg-white border rounded-lg shadow mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 border">Symbol</th>
            <th className="px-4 py-2 border">Price</th>
            <th className="px-4 py-2 border">Change %</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s, i) => (
            <tr
              key={i}
              className={`cursor-pointer hover:bg-gray-50 ${
                selected === s["01. symbol"] ? "bg-blue-100" : ""
              }`}
              onClick={() => setSelected(s["01. symbol"])}
            >
              <td className="px-4 py-2 border">{s["01. symbol"]}</td>
              <td className="px-4 py-2 border">${s["05. price"]}</td>
              <td
                className={`px-4 py-2 border ${
                  parseFloat(s["10. change percent"]) > 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {s["10. change percent"]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Chart */}
      <h2 className="text-xl font-semibold mb-2">
        {selected} — Last 60 trading sessions
      </h2>
      <div className="h-80 bg-white border rounded-lg shadow p-4">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="close" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No chart data available.</p>
        )}
      </div>
    </div>
  );
}
