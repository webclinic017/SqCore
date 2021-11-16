using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Globalization;
using SqCommon;
using YahooFinanceApi;

namespace FinTechCommon
{
    enum RtFreq { HighFreq, MidFreq, LowFreq };
    class RtFreqParam {
        public RtFreq RtFreq { get; set; }
        public string Name { get; set; } = string.Empty;
        public int FreqRthSec { get; set; } // RTH: Regular Trading Hours
        public int FreqOthSec { get; set; } // OTH: Outside Trading Hours
        public Timer? Timer { get; set; } = null;
        public Asset[] Assets { get; set; } = new Asset[0];
        public uint NTimerPassed { get; set; } = 0;
        public DateTime LastUpdateTimeUtc { get; set; } = DateTime.MinValue;
    }
    // many functions might use RT price, so it should be part of the MemDb
    public partial class MemDb
    {
        // ***** Plan: Historical and RT quote data
        // - the Website.app, once a day, gets historical price data from YF. Get all history.
        // - for RT price: during market-hours use IEX 'top', because it is free (and YF might ban our IP if we query too many times, IB has rate limit per minute, and VBroker need that bandwidth)
        // - pre/postmarket, also use YF, but with very-very low frequency. Once per every 5 sec. (only if any user is connected). We don't need to use IB Markprice, because YF pre-market is very quickly available at 9:00, 5.5h before open.
        // - code should know whether it is pre/postmarket hours, so we have to implement the same logic as in VBroker. (with the holiday days, and DB).
        // - Call AfterMarket = PostMarket, because shorter and tradingview.com also calls "post-market" (YF calls: After hours)

        // ***************************************************
        // YF, IB, IEX preMarket, postMarket behaviour
        // >UTC-7:50: YF:  no pre-market price. IB: there is no ask-bid, but there is an indicative value somehow, because Dashboard bar shows QQQ: 216.13 (+0.25%). I checked, that is the 'Mark price'. IB estimates that (probably for pre-market margin calls). YF and others will never have that, because it is sophisticated.
        // >UTC-8:50: YF:  no pre-market price. IB: there is no ask-bid, but previously good indicative value went back to PreviousClose, so ChgPct = 0%, so in PreMarket that far away from Open, this MarkPrice is not very useful. IB did reset the price, because preparing for pre-market open in 10min.
        // >UTC-9:10: YF (started at 9:00, there is premarket price: "Pre-Market: 4:03AM EST"), IB: There is Ask-bid spread. This is 5.5h before market open. That should be enough. 
        // So, I don't need IB indicative MarkPrice. IB AccInfo website is also good, showing QQQ change. IEX: IEX shows some false data, which is not yesterday close, 
        // but probably last day postMarket lastPrice sometime, which is not useful. 
        // So, in pre-market this IEX 'top' cannot be used. But maybe IEX cloud can be used in pre-market. Investigate.
        // It is important here, because of summer/winter time zones that IB/YF all are relative to ET time zone 4:00AM EST. This is usually 9:00 in London, 
        // but in 2020-03-12, when USA set summer time zone 2 weeks early, the 4:00AM cutoff time was 8:00AM in London. And IB/YF measured itself to EST time, not UTC time. Implement this behaviour.
        // >UTC-0:50: (at night).

        // ***************************************************
        // IEX specific only
        // https://github.com/iexg/IEX-API
        // https://cloud.iexapis.com/stable/stock/market/batch?symbols=QQQ&types=quote&token=<...>  takes about 250ms, no matter how many tickers are queried, so it is quite fast.
        // >08:20: "previousClose":215.37, !!! that is wrong. So IEX, next day at 8:20, it still gives back PreviousClose as 2 days ago. Wrong., ""latestPrice":216.48, "latestSource":"Close","latestUpdate":1582750800386," is the correct one, "iexRealtimePrice":216.44 is the 1 second earlier.
        // >09:32: "previousClose":215.37  (still wrong), ""latestPrice":216.48, "latestSource":"Close","latestUpdate":1582750800386," is the correct one, "iexRealtimePrice":216.44 is the 1 second earlier.
        // >10:12: "previousClose":215.37  (still wrong), "close":216.48,"closeTime":1582750800386  // That 'close' is correct, but previousClose is not.
        // >11:22: "previousClose":215.37  (still wrong), "close":null,"closeTime":null   // 'close' is nulled
        // >12:22: "previousClose":215.37  (still wrong), "close":null,"closeTime":null
        // >14:15: "previousClose":215.37, "latestPrice":216.48,"latestSource":"Close",  (still wrong), just 15 minutes before market open, it is still wrong., "close":null,"closeTime":null
        // >14:59: "previousClose":216.48, (finally correct) "close":null, "latestPrice":211.45,"latestSource":"IEX real time price","latestTime":"9:59:26 AM", so they fixed it only after the market opened at 14:30. It also reveals that they don't do Pre-market price, which is important for us.
        // >21:50: "previousClose":216.48, "close":null,"closeTime":null, "latestPrice":205.82,"latestSource":"IEX price","latestTime":"3:59:56 PM",
        // which is bad. The today Close price at 21:00 was 205.64, but it is not in the text anywhere. prevClose is 2 days ago, latestPrice is the 1 second early, not the ClosePrice.
        // https://cloud.iexapis.com/stable/stock/market/batch?symbols=QQQ&types=chart&token=<...> 'chart': last 30 days data per day:
        // https://cloud.iexapis.com/stable/stock/market/batch?symbols=QQQ&types=previous&token=<...>   'previous':
        // https://github.com/iexg/IEX-API/issues/357
        // This is available in /stock/quote https://iextrading.com/developer/docs/#quote
        // extendedPrice, extendedChange, extendedChangePercent, extendedPriceTime
        // These represent prices from 8am-9:30am and 4pm-5pm. We are aiming to cover the full pre/post market hours in a future version.
        // https://github.com/iexg/IEX-API/issues/693
        // >Use /stock/aapl/quote, this will return extended hours data (8AM - 5PM), "on Feb 26, 2019"
        // "I have built a pretty solid scanner and research platform on IEX, but for live trading IEX is obviously not suitable (yet?). I hope one day IEX will provide truly real-time data. Otherwise, I am pretty happy with IEX so far. Been using it for 2 years now/"
        // "We offer true real time IEX trades and quotes. IEX is the only exchange that provides free market data."
        // >"// Paid account: $1 per 1 million messages/mo: 1000000/30/20/60 = 28 messages per minute." But maybe it is infinite. Just every 1M messages is $1. The next 1M messages is another $1. Etc. that is likely. Good. So, we don't have to throttle it, just be careful than only download data if it is needed.
        // --------------------------------------------------------------
        // ------------------ Problems of IEX:
        // - pre/Postmarket only: 8am-9:30am and 4pm-5pm, when Yahoo has it from 9:00 UTC. So, it is not enough.
        // - cut-off time is too late. Until 14:30 asking PreviousDay, it still gives the price 2 days ago. When YF will have premarket data at 9:00. Although "latestPrice" can be used as close.
        // - the only good thing: in market-hours, RT prices are free, and very quick to obtain and batched.

        // use IEX only for High/Mid Freq, and only in RegularTrading. So, High/MidFreq OTH uses YF. But use it sparingly, so YF doesn't ban us.
        RtFreqParam m_highFreqParam = new RtFreqParam() { RtFreq = RtFreq.HighFreq, Name="HighFreq", FreqRthSec = 5, FreqOthSec = 5 * 60 }; // high frequency (5sec RTH, 5min otherwise-OTH) refresh for a known fixed stocks (used by VBroker) and those which were queried in the last 5 minutes (by a VBroker-test)
        RtFreqParam m_midFreqParam = new RtFreqParam() { RtFreq = RtFreq.MidFreq, Name="MidFreq", FreqRthSec =  15 * 60, FreqOthSec = 40 * 60 }; // mid frequency (15min RTH, 40min otherwise) refresh for a know fixed stocks (DashboardClient_mktHealth)
        RtFreqParam m_lowFreqParam = new RtFreqParam() { RtFreq = RtFreq.LowFreq, Name="LowFreq", FreqRthSec = 30 * 60, FreqOthSec = 1 * 60 * 60 }; // with low frequency (30 RTH, 1h otherwise) we almost all stocks. Even if nobody access them.

        // In general: higFreq: probably the traded stocks + what was RT queried by users. Mid: some special tickers (e.g. on MarketDashboard), LowFreq: ALL alive stocks.
        string[] m_highFreqTickrs = new string[] { /* VBroker */ };
        string[] m_midFreqTickrs = new string[] {"S/QQQ", "S/SPY", "S/GLD", "S/TLT", "S/VXX", "S/UNG", "S/USO" /* DashboardClient_mktHealth.cs */ };

        Dictionary<Asset, DateTime> m_lastRtPriceQueryTime = new Dictionary<Asset, DateTime>();

        uint m_nIexDownload = 0;
        uint m_nYfDownload = 0;

        static void InitAllAssetsPriorCloseAndLastPrice(AssetsCache p_newAssetCache)    // this is called at Program.Init() and at ReloadDbDataIfChangedImpl()
        {
            Asset[] downloadAliveAssets = p_newAssetCache.Assets.Where(r => r.AssetId.AssetTypeID == AssetType.Stock  && (r as Stock)!.ExpirationDate == string.Empty).ToArray();
            if (downloadAliveAssets.Length == 0)
                return;
            var tradingHoursNow = Utils.UsaTradingHoursExNow_withoutHolidays();
            DownloadPriorCloseAndLastPriceYF(downloadAliveAssets, tradingHoursNow).TurnAsyncToSyncTask();
        }

        void OnReloadAssetData_InitAndScheduleRtTimers()  // this is called at Program.Init() and at ReloadDbDataIfChangedImpl()
        {
            m_lastRtPriceQueryTime = new Dictionary<Asset, DateTime>(); // purge out history after AssetData reload
            m_highFreqParam.Assets = m_highFreqTickrs.Select(r => AssetsCache.GetAsset(r)!).ToArray();
            m_midFreqParam.Assets = m_midFreqTickrs.Select(r => AssetsCache.GetAsset(r)!).ToArray();
            m_lowFreqParam.Assets = AssetsCache.Assets.Where(r => r.AssetId.AssetTypeID == AssetType.Stock && (r as Stock)!.ExpirationDate == string.Empty && !m_highFreqTickrs.Contains(r.SqTicker) && !m_midFreqTickrs.Contains(r.SqTicker)).ToArray()!;

            // Main logic:
            // schedule RtTimer_Elapsed() at Init() (after every OnReloadAssetData) and also once per hour (lowFreq) (even if nobody asked it) for All assets in MemDb. So we always have more or less fresh data
            // GetLastRtPrice() always return data without blocking. Data might be 1 hour old, but it is OK. If we are in a Non-busy mode, then switch to busy and schedule it immediately.
            if (m_highFreqParam.Timer == null)
                m_highFreqParam.Timer = new System.Threading.Timer(new TimerCallback(RtTimer_Elapsed), m_highFreqParam, TimeSpan.FromMilliseconds(-1.0), TimeSpan.FromMilliseconds(-1.0));
            if (m_midFreqParam.Timer == null)
                m_midFreqParam.Timer = new System.Threading.Timer(new TimerCallback(RtTimer_Elapsed), m_midFreqParam, TimeSpan.FromMilliseconds(-1.0), TimeSpan.FromMilliseconds(-1.0));
            if (m_lowFreqParam.Timer == null)
                m_lowFreqParam.Timer = new System.Threading.Timer(new TimerCallback(RtTimer_Elapsed), m_lowFreqParam, TimeSpan.FromMilliseconds(-1.0), TimeSpan.FromMilliseconds(-1.0));

            ScheduleTimerRt(m_highFreqParam);
            ScheduleTimerRt(m_midFreqParam);
            ScheduleTimerRt(m_lowFreqParam);
        }

        public void ServerDiagnosticRealtime(StringBuilder p_sb)
        {
            var recentlyAskedAssets = m_lastRtPriceQueryTime.Where(r => (DateTime.UtcNow - r.Value) <= TimeSpan.FromSeconds(5 * 60));
            p_sb.Append($"Realtime: actual non-empty m_nYfDownload: {m_nYfDownload}, actual non-empty m_nIexDownload:{m_nIexDownload}, all recentlyAskedAssets:'{String.Join(',', recentlyAskedAssets.Select(r => r.Key.SqTicker + "(" + ((int)((DateTime.UtcNow - r.Value).TotalSeconds)).ToString() + "sec)"))}' <br>");

            ServerDiagnosticRealtime(p_sb, m_highFreqParam);
            ServerDiagnosticRealtime(p_sb, m_midFreqParam);
            ServerDiagnosticRealtime(p_sb, m_lowFreqParam);
        }

        private static void ServerDiagnosticRealtime(StringBuilder p_sb, RtFreqParam p_rtFreqParam)
        {
            p_sb.Append($"Realtime ({p_rtFreqParam.Name}): LastUpdateUtc: {p_rtFreqParam.LastUpdateTimeUtc.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)}, FreqRthSec: {p_rtFreqParam.FreqRthSec}, FreqOthSec: {p_rtFreqParam.FreqOthSec}, #TimerPassed: {p_rtFreqParam.NTimerPassed}, assets: '");
            p_sb.AppendLongListByLine(p_rtFreqParam.Assets.Where(r => r.AssetId.AssetTypeID == AssetType.Stock).Select(r => ((Stock)r).YfTicker), ",", 30, "<br>");
            p_sb.Append($"'<br>");
        }

        public void RtTimer_Elapsed(object? p_state)    // Timer is coming on a ThreadPool thread
        {
            if (p_state == null)
                throw new Exception("RtTimer_Elapsed() received null object.");

            RtFreqParam freqParam = (RtFreqParam)p_state;
            Utils.Logger.Info($"MemDbRt.RtTimer_Elapsed({freqParam.RtFreq}). BEGIN.");
            freqParam.LastUpdateTimeUtc = DateTime.UtcNow;
            try
            {
                UpdateRtAndPriorClose(freqParam);
            }
            catch (System.Exception e)  // Exceptions in timers crash the app.
            {
                Utils.Logger.Error(e, $"MemDbRt.RtTimer_Elapsed({freqParam.RtFreq}) exception.");
            }
            ScheduleTimerRt(freqParam);
            Utils.Logger.Debug($"MemDbRt.RtTimer_Elapsed({freqParam.RtFreq}). END");
        }
        private void UpdateRtAndPriorClose(RtFreqParam p_freqParam)
        {
            p_freqParam.NTimerPassed++;
            Asset[] downloadAssets = p_freqParam.Assets;
            if (p_freqParam.RtFreq == RtFreq.HighFreq) // if it is highFreq timer, then add the recently asked assets.
            {
                var recentlyAskedNonNavAssets = m_lastRtPriceQueryTime.Where(r => r.Key.AssetId.AssetTypeID == AssetType.Stock && ((DateTime.UtcNow - r.Value) <= TimeSpan.FromSeconds(5 * 60))).Select(r => r.Key); //  if there was a function call in the last 5 minutes
                downloadAssets = p_freqParam.Assets.Concat(recentlyAskedNonNavAssets).ToArray();
            }
            if (downloadAssets.Length == 0)
                return;

            // IEX is faster (I guess) and we don't risk that YF bans our server for important historical data. Don't query YF too frequently.
            // Prefer YF, because IEX returns "lastSalePrice":0, while YF returns RT correctly for these 6 stocks: BIB,IDX,MVV,RTH,VXZ,LBTYB
            // https://api.iextrading.com/1.0/tops?symbols=BIB,IDX,MVV,RTH,VXZ,LBTYB
            // https://query1.finance.yahoo.com/v7/finance/quote?symbols=BIB,IDX,MVV,RTH,VXZ,LBTYB
            // Therefore, use IEX only for High/Mid Freq, and only in RegularTrading.
            // LowFreq is the all 700 tickers. For that we need those 6 assets as well.

            var tradingHoursNow = Utils.UsaTradingHoursExNow_withoutHolidays();
            bool useIexRt = p_freqParam.RtFreq != RtFreq.LowFreq && tradingHoursNow == TradingHoursEx.RegularTrading; // use IEX only for High/Mid Freq, and only in RegularTrading.

            if (p_freqParam.RtFreq == RtFreq.LowFreq)
                Utils.Logger.Info($"UpdateRtAndPriorClose(RtFreq.LowFreq): useIexRt:{useIexRt}");  // TEMP

            if (useIexRt)
            {
                m_nIexDownload++;
                DownloadLastPriceIex(downloadAssets).TurnAsyncToSyncTask();
            }
            else
            {
                m_nYfDownload++;
                DownloadPriorCloseAndLastPriceYF(downloadAssets, tradingHoursNow).TurnAsyncToSyncTask();
            }
        }
        private void ScheduleTimerRt(RtFreqParam p_freqParam)
        {
            // lock (m_rtTimerLock)
            var tradingHoursNow = Utils.UsaTradingHoursExNow_withoutHolidays();
            p_freqParam.Timer!.Change(TimeSpan.FromSeconds((tradingHoursNow == TradingHoursEx.RegularTrading) ? p_freqParam.FreqRthSec : p_freqParam.FreqOthSec), TimeSpan.FromMilliseconds(-1.0));
        }


        // GetLastRtValue() always return data without blocking. Data might be 1 hour old or 3sec (RTH) or in 60sec (non-RTH) for m_assetIds only if there was a function call in the last 5 minutes (busyMode), but it is OK.
        public IEnumerable<(AssetId32Bits SecdID, float LastValue)> GetLastRtValue(uint[] p_assetIds)     // C# 7.0 adds tuple types and named tuple literals. uint[] is faster to create and more RAM efficient than linked-list<uint>
        {
            IEnumerable<(AssetId32Bits SecdID, float LastValue)> rtPrices = p_assetIds.Select(r =>
                {
                    var sec = AssetsCache.GetAsset(r);
                    m_lastRtPriceQueryTime[sec] = DateTime.UtcNow;
                    DateTime lastDateTime = DateTime.MinValue;
                    float lastValue;
                    if (sec.AssetId.AssetTypeID == AssetType.BrokerNAV)
                        (lastValue, lastDateTime) = GetLastNavRtPrice((sec as BrokerNav)!);
                    else
                    {
                        lastValue = sec.LastValue;
                    }
                    return (sec.AssetId, lastValue);
                });
            return rtPrices;
        }
        public IEnumerable<(AssetId32Bits SecdID, float LastValue, DateTime LastValueUtc)> GetLastRtValueWithUtc(uint[] p_assetIds)     // C# 7.0 adds tuple types and named tuple literals. uint[] is faster to create and more RAM efficient than List<uint>
        {
            IEnumerable<(AssetId32Bits SecdID, float LastValue, DateTime LastValueUtc)> rtPrices = p_assetIds.Select(r =>
                {
                    var sec = AssetsCache.GetAsset(r);
                    m_lastRtPriceQueryTime[sec] = DateTime.UtcNow;
                    DateTime lastDateTime = DateTime.MinValue;
                    float lastValue;
                    if (sec.AssetId.AssetTypeID == AssetType.BrokerNAV)
                        (lastValue, lastDateTime) = GetLastNavRtPrice((sec as BrokerNav)!);
                    else
                    {
                        lastValue = sec.LastValue;
                        lastDateTime = sec.LastValueUtc;
                    }
                    return (sec.AssetId, lastValue, lastDateTime);
                });
            return rtPrices;
        }

        public IEnumerable<(AssetId32Bits SecdID, float LastValue, DateTime LastValueUtc)> GetLastRtValueWithUtc(List<Asset> p_assets)     // C# 7.0 adds tuple types and named tuple literals. uint[] is faster to create and more RAM efficient than List<uint>
        {
            IEnumerable<(AssetId32Bits SecdID, float LastValue, DateTime LastValueUtc)> rtPrices = p_assets.Select(r =>
                {
                    m_lastRtPriceQueryTime[r] = DateTime.UtcNow;
                    DateTime lastDateTime = DateTime.MinValue;
                    float lastValue;
                    if (r.AssetId.AssetTypeID == AssetType.BrokerNAV)
                        (lastValue, lastDateTime) = GetLastNavRtPrice((r as BrokerNav)!);
                    else
                    {
                        lastValue = r.LastValue;
                        lastDateTime = r.LastValueUtc;
                    }
                    return (r.AssetId, lastValue, lastDateTime);
                });
            return rtPrices;
        }

        public float GetLastRtValue(Asset p_asset)
        {

            m_lastRtPriceQueryTime[p_asset] = DateTime.UtcNow;
            DateTime lastDateTime = DateTime.MinValue;
            float lastValue;
            if (p_asset.AssetId.AssetTypeID == AssetType.BrokerNAV)
                lastValue = GetLastNavRtPrice((p_asset as BrokerNav)!).LastValue;
            else
                lastValue = p_asset.LastValue;
            return lastValue;
        }

        public static Task DownloadPriorCloseAndLastPriceYF(Asset[] p_assets)  // takes ? ms from WinPC
        {
            var tradingHoursNow = Utils.UsaTradingHoursExNow_withoutHolidays();
            return DownloadPriorCloseAndLastPriceYF(p_assets, tradingHoursNow);
        }

        async static Task DownloadPriorCloseAndLastPriceYF(Asset[] p_assets, TradingHoursEx p_tradingHoursNow)  // takes ? ms from WinPC
        {
            Utils.Logger.Debug("DownloadLastPriceYF() START");
            try
            {
                string lastValFieldStr = p_tradingHoursNow switch
                {
                    TradingHoursEx.PrePreMarketTrading => "PostMarketPrice",    // YF data fields ([R]egularMarketPrice) have to be capitalized in C# even though the JSON data has JS notation, starting with lowercase.
                    TradingHoursEx.PreMarketTrading => "PreMarketPrice",
                    TradingHoursEx.RegularTrading => "RegularMarketPrice",
                    TradingHoursEx.PostMarketTrading => "PostMarketPrice",
                    TradingHoursEx.Closed => "PostMarketPrice",
                    _ => throw new ArgumentOutOfRangeException(nameof(p_tradingHoursNow), $"Not expected p_tradingHoursNow value: {p_tradingHoursNow}"),
                };

                // What field to excract for PriorClose from YF?
                // > At the weekend, we would like to see the Friday data, so regularMarketPreviousClose (Thursday) is fine.
                // >PrePreMarket: What about 6:00GMT on Monday? That is 1:00ET. That is not regular trading yet, which starts at 4:00ET. But IB shows Friday closes at that time is PriorClose. We would like to see Friday closes as well. So, in PrePreMarket, use regularMarketPrice
                // >If we are in PreMarket trading (then proper RT prices will come), then use regularMarketPrice
                // >If we are RTH or PostMarket, or Close, use regularMarketPreviousClose. That way, at the weekend, we can observe BrAccViewer table as it was at Friday night.
                string priorCloseFieldStr = p_tradingHoursNow switch
                {
                    TradingHoursEx.PrePreMarketTrading => "RegularMarketPrice",
                    TradingHoursEx.PreMarketTrading => "RegularMarketPrice",
                    TradingHoursEx.RegularTrading => "RegularMarketPreviousClose",
                    TradingHoursEx.PostMarketTrading => "RegularMarketPreviousClose",
                    TradingHoursEx.Closed => "RegularMarketPreviousClose",
                    _ => throw new ArgumentOutOfRangeException(nameof(p_tradingHoursNow), $"Not expected p_tradingHoursNow value: {p_tradingHoursNow}"),
                };

                // https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,AMZN  returns all the fields.
                // https://query1.finance.yahoo.com/v7/finance/quote?symbols=QQQ%2CSPY%2CGLD%2CTLT%2CVXX%2CUNG%2CUSO&fields=symbol%2CregularMarketPreviousClose%2CregularMarketPrice%2CmarketState%2CpostMarketPrice%2CpreMarketPrice  // returns just the specified fields.
                // "marketState":"PRE" or "marketState":"POST", In PreMarket both "preMarketPrice" and "postMarketPrice" are returned.
                var yfTickers = p_assets.Select(r => (r as Stock)!.YfTicker).ToArray();
                var quotes = await Yahoo.Symbols(yfTickers).Fields(new Field[] { Field.Symbol, Field.RegularMarketPreviousClose, Field.RegularMarketPrice, Field.MarketState, Field.PostMarketPrice, Field.PreMarketPrice }).QueryAsync();
                
                int nReceivedAndRecognized = 0;
                foreach (var quote in quotes)
                {
                    Asset? sec = null;
                    foreach (var s in p_assets)
                    {
                        if ((s as Stock)!.YfTicker == quote.Key)
                        {
                            sec = s;
                            break;
                        }
                    }

                    if (sec != null)
                    {
                        nReceivedAndRecognized++;
                        // TLT doesn't have premarket data. https://finance.yahoo.com/quote/TLT  "quoteSourceName":"Delayed Quote", while others: "quoteSourceName":"Nasdaq Real Time Price"
                        dynamic? lastVal = float.NaN;
                        if (!quote.Value.Fields.TryGetValue(lastValFieldStr, out lastVal))
                            lastVal = (float)quote.Value.RegularMarketPrice;  // fallback: the last regular-market Close price both in Post and next Pre-market
                        sec.LastValue = (float)lastVal;

                        if (quote.Value.Fields.TryGetValue(priorCloseFieldStr, out dynamic? priorClose))
                            sec.PriorClose = (float)priorClose;

                        if (sec.SqTicker == "S/UNG")
                            Utils.Logger.Info($"UNG priorClose: {sec.PriorClose}, lastVal:{sec.LastValue}");  // TEMP
                    }
                }


                if (p_assets.Length > 100)  // only called in LowFreq timer.
                    Utils.Logger.Info($"DownloadPriorCloseAndLastPriceYF: #queried:{yfTickers.Length}, #received:{nReceivedAndRecognized}");  // TEMP

                if (nReceivedAndRecognized != yfTickers.Length)
                    Utils.Logger.Warn($"DownloadLastPriceYF() problem. #queried:{yfTickers.Length}, #received:{nReceivedAndRecognized}");
            }
            catch (Exception e)
            {
                Utils.Logger.Error(e, "DownloadLastPriceYF()");
            }
        }

        // compared to IB data stream, IEX is sometimes 5-10 sec late. But sometimes it is not totally accurate. It is like IB updates its price every second. IEX updates randomly. Sometimes it updates every 1 second, sometime after 10seconds. In general this is fine.
        // "We limit requests to 100 per second per IP measured in milliseconds, so no more than 1 request per 10 milliseconds."
        // https://iexcloud.io/pricing/ 
        // Free account: 50,000 core messages/mo, That is 50000/30/20/60 = 1.4 message per minute. 
        // Paid account: $1 per 1 million messages/mo: 1000000/30/20/60 = 28 messages per minute.
        // But maybe it is infinite. Just every 1M messages is $1. The next 1M messages is another $1. Etc. that is likely. Good. So, we don't have to throttle it, just be careful than only download data if it is needed.
        // At the moment 'tops' works without token, as https://api.iextrading.com/1.0/tops?symbols=QQQ,SPY,TLT,GLD,VXX,UNG,USO
        // but 'last' or other PreviousClose calls needs token: https://api.iextrading.com/1.0/lasts?symbols=QQQ,SPY,TLT,GLD,VXX,UNG,USO
        // Solution: query real-time lastPrice every 2 seconds, but query PreviousClose only once a day.
        // This doesn't require token (but doesn't have PriorClose): https://api.iextrading.com/1.0/tops?symbols=AAPL,GOOGL
        // PreviousClose data requires token: https://cloud.iexapis.com/stable/stock/market/batch?symbols=AAPL,FB&types=quote&token=<get it from sensitive-data file>
        static async Task DownloadLastPriceIex(Asset[] p_assets)  // takes 450-540ms from WinPC
        {
            Utils.Logger.Debug("DownloadLastPriceIex() START");
            try
            {
                //string url = string.Format("https://api.iextrading.com/1.0/stock/market/batch?symbols={0}&types=quote", p_tickerString);
                //string url = string.Format("https://api.iextrading.com/1.0/last?symbols={0}", p_tickerString);       // WebExceptionStatus.ProtocolError: "Not Found"

                string[]? iexTickers = p_assets.Select(r => (r as Stock)!.IexTicker).ToArray(); // treat similarly as DownloadLastPriceYF()

                string url = string.Format("https://api.iextrading.com/1.0/tops?symbols={0}", String.Join(",", iexTickers));
                string? responseStr = await Utils.DownloadStringWithRetryAsync(url);
                if (responseStr == null)
                    return;

                Utils.Logger.Debug("DownloadLastPriceIex() str = '{0}'", responseStr);
                ExtractAttributeIex(responseStr, "lastSalePrice", p_assets);
            }
            catch (Exception e)
            {
                Utils.Logger.Error(e, "DownloadLastPriceIex()");
            }
        }

        static private void ExtractAttributeIex(string p_responseStr, string p_attribute, Asset[] p_assets)
        {
            List<string> zeroValueSymbols = new List<string>();
            int iStr = 0;   // this is the fastest. With IndexOf(). Not using RegEx, which is slow.
            while (iStr < p_responseStr.Length)
            {
                int bSymbol = p_responseStr.IndexOf("symbol\":\"", iStr);
                if (bSymbol == -1)
                    break;
                bSymbol += "symbol\":\"".Length;
                int eSymbol = p_responseStr.IndexOf("\"", bSymbol);
                if (eSymbol == -1)
                    break;
                string iexTicker = p_responseStr.Substring(bSymbol, eSymbol - bSymbol);
                int bAttribute = p_responseStr.IndexOf(p_attribute + "\":", eSymbol);
                if (bAttribute == -1)
                    break;
                bAttribute += (p_attribute + "\":").Length;
                int eAttribute = p_responseStr.IndexOf(",\"", bAttribute);
                if (eAttribute == -1)
                    break;
                string attributeStr = p_responseStr.Substring(bAttribute, eAttribute - bAttribute);
                // only search ticker among the stocks p_assetIds. Because duplicate tickers are possible in the MemDb.Assets, but not expected in p_assetIds
                Stock? stock = null;
                foreach (var sec in p_assets)
                {
                    Stock? iStock = sec as Stock;
                    if (iStock == null)
                        continue;
                    if (iStock.IexTicker == iexTicker)
                    {
                        stock = iStock;
                        break;
                    }
                }

                if (stock != null)
                {
                    float.TryParse(attributeStr, out float attribute);

                    if (attribute == 0.0f)
                        zeroValueSymbols.Add(stock.Symbol);
                    else // don't overwrite the MemDb data with false 0.0 values.
                    {
                        switch (p_attribute)
                        {
                            case "previousClose":
                                // sec.PreviousCloseIex = attribute;
                                break;
                            case "lastSalePrice":
                                stock.LastValue = attribute;
                                break;
                        }
                    }
                }
                iStr = eAttribute;
            }

            if (zeroValueSymbols.Count != 0)
                Utils.Logger.Warn($"ExtractAttributeIex() zero lastPrice values: {String.Join(',', zeroValueSymbols)}");
        }

    }

}