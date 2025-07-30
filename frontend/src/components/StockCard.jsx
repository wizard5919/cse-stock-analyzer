function StockCard({ stock }) {
  return (
    <div className="relative">
      {/* ... existing code ... */}
      
      {/* Signal Indicator */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
        stock.signal === 'STRONG_BUY' ? 'bg-green-100 text-green-800' :
        stock.signal === 'BUY' ? 'bg-emerald-100 text-emerald-800' :
        stock.signal === 'STRONG_SELL' ? 'bg-red-100 text-red-800' :
        stock.signal === 'SELL' ? 'bg-rose-100 text-rose-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {stock.signal}
      </div>
    </div>
  );
}
