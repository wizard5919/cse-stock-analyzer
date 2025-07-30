function StockChart({ stock, historicalData, indicators }) {
  // ...
  
  const chartData = historicalData.map((item, index) => ({
    date: item.date,
    price: item.close,
    volume: item.volume,
    ema20: indicators.ema20[index],
    ema50: indicators.ema50[index],
    macd: indicators.macd[index]?.MACD,
    signal: indicators.macd[index]?.signal
  }));

  return (
    <div>
      {/* ... */}
      
      {/* Add MACD subchart */}
      <div className="h-40 mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <Bar dataKey="volume" fill="#8884d8" />
            <Line dataKey="macd" stroke="#ff7300" dot={false} />
            <Line dataKey="signal" stroke="#413ea0" dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
