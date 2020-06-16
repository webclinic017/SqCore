
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;

namespace FinTechCommon
{
    [DebuggerDisplay("LastTicker = {LastTicker}, AssetId({AssetId})")]
    public class Asset
    {
        public AssetId32Bits AssetId { get; set; } = AssetId32Bits.Invalid; // invalid value is best to be 0. If it is Uint32.MaxValue is the invalid, then problems if extending to Uint64

        public String ISIN { get; set; } = String.Empty;    // International Securities Identification Number would be a unique identifier. Not used for now.
        public ExchangeId PrimaryExchange { get; set; } = ExchangeId.Unknown; // different assed with the same "VOD" ticker can exist in LSE, NYSE; YF uses "VOD" and "VOD.L"

        public string LastTicker { get; set; } = String.Empty;  // a security has a LastTicker Now, but in the past it might have a different ticker before ticker rename
        public List<TickerChange> TickerChanges { get; set; } = new List<TickerChange>();
        public string ExpectedHistorySpan { get; set; } = String.Empty;

		public CurrencyId Currency { get; set; } = CurrencyId.USD;	// if stocks with different currencies are in the portfolio they have to be converted to USD, if they are not. IB has a BaseCurrency of the account. We use USD as the base currency of the program. Every calculations are based in the USD form.
        public float LastPriceIex { get; set; } = -100.0f;     // real-time last price
        public float LastPriceYF { get; set; } = -100.0f;     // real-time last price
    }

    public class TickerChange {
        public DateTime TimeUtc { get; set; } = DateTime.MinValue;
        public String Ticker { get; set; } = String.Empty;
    }

    public enum ExchangeId : sbyte // differs from dbo.StockExchange, which is 'int'
	{
		NASDAQ = 1,
		NYSE = 2,
		[Description("NYSE MKT LLC")]
		AMEX = 3,
		[Description("Pink OTC Markets")]
		PINK = 4,
		CDNX = 5,       // Canadian Venture Exchange, postfix: ".V"
		LSE = 6,        // London Stock Exchange, postfix: ".L"
		[Description("XTRA")]
		XETRA = 7,      // Exchange Electronic Trading (Germany)
		CBOE = 8,
		[Description("NYSE ARCA")]
		ARCA = 9,
		BATS = 10,
		[Description("OTC Bulletin Boards")]
		OTCBB = 11,

		Unknown = -1    // BooleanFilterWith1CacheEntryPerAssetID.CacheRec.StockExchangeID exploits that values fit in an sbyte
		                // TickerProvider.OldStockTickers exploits that values fit in a byte
	}

	public enum CurrencyId : byte   // there are 192 countries in the world, and less than 192 currencies
	{                               // PortfolioEvaluator.BulkPreparer.Plan() exploits that all values are in 1..62
		USD = 1,
		EUR = 2,
		GBX = 3,
		JPY = 4,
		HUF = 5,
		CNY = 6,
		CAD = 7,
        CHF = 8,
        ILS = 9,
		Unknown = 255
        // Some routines use ~GBX == 252 to indicate GBP, e.g. DBUtils.ConvertToUsd(),ConvertFromUsd(),YQCrawler.CurrencyConverter etc.
	}


	public enum CountryId : byte    // there are 192 countries in the world. warning: 2009-06: the Company.BaseCountryID is in reality CountryCode
	{
		UnitedStates = 1,
		UnitedKingdom = 2,
		China = 3,
		Japan = 4,
		Germany = 5,
		France = 6,
		Canada = 7,
		Russia = 8,
		Brazil = 9,
		India = 10,
		Hungary = 11,

        // DBUtils.g_defaultMarketHolidays exploits that 0 < CountryID.USA,UK,Germany < 20

		Unknown = 255
	}

	
	public enum StockIndexId : short    // According to dbo.StockIndex
	{
		SP500 = 1,
		VIX,
		Nasdaq,
		DowJones,
		Russell2000,
		Russell1000,
		PHLX_Semiconductor,
		VXN,
		Unknown = -1
	}

	class Split
    {
        public DateTime Date { get; set; }

		public double Before { get; set; }
		public double After { get; set; }
    }
}