import os
from dotenv import load_dotenv
import yfinance as yf
import statistics

# Load environment variables from .env file
load_dotenv()

def get_stock_data(ticker):
    """Fetch stock data for a given ticker"""
    try:
        stock = yf.Ticker(ticker)
        
        # Get basic info
        info = stock.info
        current_price = info.get('currentPrice', 'N/A')
        pe_ratio = info.get('trailingPE', 'N/A')
        dividend_yield = info.get('dividendYield', 'N/A')
        market_cap = info.get('marketCap', 'N/A')
        sector = info.get('sector', 'N/A')
        
        return {
            'ticker': ticker,
            'price': current_price,
            'pe_ratio': pe_ratio,
            'dividend_yield': dividend_yield,
            'market_cap': market_cap,
            'sector': sector
        }
    except Exception as e:
        return {'ticker': ticker, 'error': str(e)}

def analyze_portfolio(stocks_data):
    """Analyze portfolio using Python logic (no API calls)"""
    
    # Filter out stocks with errors
    valid_stocks = [s for s in stocks_data if 'error' not in s]
    
    if not valid_stocks:
        return "ERROR: Could not fetch data for any stocks."
    
    # Basic analysis
    analysis = []
    analysis.append("\n=== PORTFOLIO ANALYSIS ===\n")
    
    # 1. Portfolio Overview
    analysis.append("1. PORTFOLIO OVERVIEW")
    analysis.append(f"   Total Holdings: {len(valid_stocks)} stocks\n")
    
    # Get sectors
    sectors = {}
    for stock in valid_stocks:
        sector = stock.get('sector', 'Unknown')
        sectors[sector] = sectors.get(sector, 0) + 1
    
    analysis.append("   Sector Breakdown:")
    for sector, count in sectors.items():
        analysis.append(f"   - {sector}: {count} holding(s)")
    
    # 2. Risk Assessment
    analysis.append("\n2. RISK ASSESSMENT")
    pe_ratios = [s['pe_ratio'] for s in valid_stocks if isinstance(s['pe_ratio'], (int, float))]
    
    if pe_ratios:
        avg_pe = statistics.mean(pe_ratios)
        analysis.append(f"   Average P/E Ratio: {avg_pe:.2f}")
        
        if avg_pe < 15:
            analysis.append("   ✓ Portfolio appears UNDERVALUED (lower P/E ratios)")
            risk_level = "LOW"
        elif avg_pe < 25:
            analysis.append("   ○ Portfolio appears FAIRLY VALUED")
            risk_level = "MEDIUM"
        else:
            analysis.append("   ⚠ Portfolio appears EXPENSIVE (higher P/E ratios)")
            risk_level = "HIGH"
        
        analysis.append(f"   Overall Risk Level: {risk_level}\n")
    
    # 3. Dividend Analysis
    analysis.append("3. INCOME ANALYSIS (Dividends)")
    dividend_stocks = [s for s in valid_stocks if isinstance(s['dividend_yield'], (int, float)) and s['dividend_yield'] > 0]
    
    if dividend_stocks:
        avg_dividend = statistics.mean([s['dividend_yield'] for s in dividend_stocks])
        analysis.append(f"   Dividend-Paying Stocks: {len(dividend_stocks)}/{len(valid_stocks)}")
        analysis.append(f"   Average Dividend Yield: {avg_dividend*100:.2f}%\n")
    else:
        analysis.append("   ⚠ No dividend-paying stocks in portfolio")
        analysis.append("   Consider adding dividend stocks for passive income\n")
    
    # 4. Stock Breakdown
    analysis.append("4. INDIVIDUAL STOCK ANALYSIS")
    for stock in valid_stocks:
        analysis.append(f"\n   {stock['ticker']}:")
        analysis.append(f"   - Price: ${stock['price']}")
        
        if isinstance(stock['pe_ratio'], (int, float)):
            analysis.append(f"   - P/E Ratio: {stock['pe_ratio']:.2f}")
        
        if isinstance(stock['dividend_yield'], (int, float)):
            analysis.append(f"   - Dividend Yield: {stock['dividend_yield']*100:.2f}%")
        
        analysis.append(f"   - Sector: {stock['sector']}")
    
    # 5. Recommendations
    analysis.append("\n5. RECOMMENDATIONS")
    
    if len(set(sectors.keys())) <= 2:
        analysis.append("   ⚠ DIVERSIFY: Your portfolio is concentrated in few sectors")
        analysis.append("     Consider adding stocks from other sectors (Healthcare, Utilities, Consumer, etc.)")
    else:
        analysis.append("   ✓ Good sector diversification")
    
    if len(dividend_stocks) == 0:
        analysis.append("   • Add dividend stocks if you want passive income")
    
    if risk_level == "HIGH":
        analysis.append("   • Consider rebalancing toward lower P/E stocks for stability")
    
    analysis.append("\n" + "="*50)
    
    return "\n".join(analysis)

def main():
    """Main function to run the portfolio analyzer"""
    print("=" * 50)
    print("AI Portfolio Analyzer (Python Edition)")
    print("=" * 50)
    
    # Get tickers from user
    print("\nEnter stock tickers separated by commas (e.g., AAPL,MSFT,TSLA): ")
    tickers_input = input()
    tickers = [t.strip().upper() for t in tickers_input.split(',')]
    
    print(f"\nFetching data for {len(tickers)} stocks...")
    
    # Fetch stock data
    stocks_data = []
    for ticker in tickers:
        print(f"  - Fetching {ticker}...")
        try:
            data = get_stock_data(ticker)
            stocks_data.append(data)
            print(f"    ✓ {ticker} data fetched")
        except Exception as e:
            print(f"    ✗ Error fetching {ticker}: {e}")
    
    print("\nAnalyzing portfolio...")
    
    # Get analysis
    analysis = analyze_portfolio(stocks_data)
    
    print(analysis)

if __name__ == "__main__":
    main()