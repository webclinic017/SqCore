using System;
using System.Threading;
using SqCommon;
using System.Collections.Generic;
using System.Text;
using System.Net.WebSockets;
using System.Threading.Tasks;
using System.Linq;
using System.Xml.Linq;
using System.ServiceModel.Syndication;
using System.Net;
using System.Diagnostics;

namespace SqCoreWeb
{
    public partial class DashboardClient
    {
        static readonly QuickfolioNewsDownloader g_newsDownloader = new(); // only 1 global downloader for all clients
        // one global static quickfolio News Timer serves all clients. For efficiency.
        static readonly Timer m_qckflNewsTimer = new(new TimerCallback(QckflNewsTimer_Elapsed), null, TimeSpan.FromMilliseconds(-1.0), TimeSpan.FromMilliseconds(-1.0));
        static bool isQckflNewsTimerRunning = false;
        static readonly object m_qckflNewsTimerLock = new();
        static readonly int m_qckflNewsTimerFrequencyMs = 15 * 60 * 1000; // timer for 15 minutes
        static readonly TimeSpan c_initialSleepIfNotActiveToolQn2 = TimeSpan.FromMilliseconds(10 * 1000); // 10sec
        readonly Dictionary<string, List<NewsItem>> m_newsMemory = new();
        static readonly Random g_random = new(DateTime.Now.Millisecond);
        static readonly KeyValuePair<int, int> g_sleepBetweenDnsMs = new(2000, 1000); // <fix, random>


        // string[] m_stockTickers2 = { };
        string[] m_stockTickers2 = Array.Empty<string>();

        public void OnConnectedWsAsync_QckflNews2(bool p_isThisActiveToolAtConnectionInit)
        {
            Utils.RunInNewThread(ignored => // running parallel on a ThreadPool thread, FireAndForget: QueueUserWorkItem [26microsec] is 25% faster than Task.Run [35microsec]
            {
                Thread.CurrentThread.IsBackground = true;  //  thread will be killed when all foreground threads have died, the thread will not keep the application alive.

                // Assuming this tool is not the main Tab page on the client, we delay sending all the data, to avoid making the network and client too busy an unresponsive
                if (!p_isThisActiveToolAtConnectionInit)
                    Thread.Sleep(DashboardClient.c_initialSleepIfNotActiveToolQn2); // 10 sec is quite a long waiting, but we rarely use this tool.
                
                if (m_stockTickers2.Length == 0)
                    m_stockTickers2 = GetQckflStockTickers2() ?? Array.Empty<string>();
                
                byte[] encodedMsg = Encoding.UTF8.GetBytes("QckfNews.Tickers:" + Utils.CamelCaseSerialize(new List<string> { "All assets" }.Union(m_stockTickers2).ToList()));
                if (WsWebSocket!.State == WebSocketState.Open)
                    WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);

                lock (m_qckflNewsTimerLock)
                {
                    if (!isQckflNewsTimerRunning)
                    {
                        Utils.Logger.Info("OnConnectedAsync_QckflNews(). Starting m_qckflNewsTimer.");
                        isQckflNewsTimerRunning = true;
                        m_qckflNewsTimer.Change(System.TimeSpan.Zero, TimeSpan.FromMilliseconds(-1.0));    // runs only once. To avoid that it runs parallel, if first one doesn't finish
                    }
                }
                // first client connects, we start the timer immediately. helper: bool isQckflNewsTimerRunning = false;
                // after that... this timer should be run every 15min
                // in that timer function... we have do download CommonNews + Stock news.
                // in that timer, when the downloading of news are done => send it to All open Clients.
            });
        }
        public static string[]? GetQckflStockTickers2()
        {
            string? valuesFromGSheetStr = "Error. Make sure GoogleApiKeyKey, GoogleApiKeyKey is in SQLab.WebServer.SQLab.NoGitHub.json !";
            if (!String.IsNullOrEmpty(Utils.Configuration["Google:GoogleApiKeyName"]) && !String.IsNullOrEmpty(Utils.Configuration["Google:GoogleApiKeyKey"]))
            {
                valuesFromGSheetStr = Utils.DownloadStringWithRetryAsync("https://sheets.googleapis.com/v4/spreadsheets/1c5ER22sXDEVzW3uKthclpArlZvYuZd6xUffXhs6rRsM/values/A1%3AA1?key=" + Utils.Configuration["Google:GoogleApiKeyKey"]).TurnAsyncToSyncTask();
                if (valuesFromGSheetStr == null)
                    valuesFromGSheetStr = "Error in DownloadStringWithRetry().";
            }
            if (!valuesFromGSheetStr.StartsWith("Error")) 
            {
                int pos = valuesFromGSheetStr.IndexOf(@"""values"":");
                if (pos < 0)
                    return null;
                valuesFromGSheetStr = valuesFromGSheetStr[(pos + 9)..]; // cut off until the end of "values":
                int posStart = valuesFromGSheetStr.IndexOf(@"""");
                if (posStart < 0)
                    return null;
                int posEnd = valuesFromGSheetStr.IndexOf(@"""", posStart + 1);
                if (posEnd < 0)
                    return null;
                string cellValue = valuesFromGSheetStr.Substring(posStart + 1, posEnd - posStart - 1);
                return cellValue.Split(',').Select(x => x.Trim()).ToArray();
            }
            else
                return null;
        }
        public void GetQckflCommonNews2()
        {
            string rssFeedUrl = string.Format(@"https://www.cnbc.com/id/100003114/device/rss/rss.html");

            // List<NewsItem> foundNewsItems = new();
            List<NewsItem> foundNewsItems = new (ReadRSSAsync2(rssFeedUrl, NewsSource.CnbcRss, string.Empty));
            byte[] encodedMsg = Encoding.UTF8.GetBytes("QckfNews.CommonNews:" + Utils.CamelCaseSerialize(foundNewsItems));
            if (WsWebSocket!.State == WebSocketState.Open)
                WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);
        }
        public static List<NewsItem> ReadRSSAsync2(string p_url, NewsSource p_newsSource, string p_ticker)
        {
            try
            {
                string? rssFeedAsString = Utils.DownloadStringWithRetryAsync(p_url, 3, TimeSpan.FromSeconds(5), true).TurnAsyncToSyncTask();
                if (String.IsNullOrEmpty(rssFeedAsString))
                {
                    Console.WriteLine($"QuickfolioNewsDownloader.ReadRSS() url download failed.");
                    return new List<NewsItem>();
                }

                // convert feed to XML using LINQ to XML and finally create new XmlReader object
                var feed = System.ServiceModel.Syndication.SyndicationFeed.Load(XDocument.Parse(rssFeedAsString).CreateReader());

                List<NewsItem> foundNews = new();

                foreach (SyndicationItem item in feed.Items)
                {
                    NewsItem newsItem = new();
                    newsItem.Ticker = p_ticker;
                    newsItem.LinkUrl = item.Links[0].Uri.AbsoluteUri;
                    newsItem.Title = WebUtility.HtmlDecode(item.Title.Text);
                    newsItem.Summary = WebUtility.HtmlDecode(item.Summary?.Text ?? string.Empty);   // <description> is missing sometimes, so Summary = null
                    newsItem.PublishDate = item.PublishDate.LocalDateTime;
                    newsItem.DownloadTime = DateTime.UtcNow;
                    newsItem.Source = p_newsSource.ToString();
                    newsItem.DisplayText = string.Empty;
                    //newsItem.setFiltered();
                    // we might filter news and bring Laszlo's bool SkipNewsItem(string p_title) here. Later. Not now.
                    foundNews.Add(newsItem);
                }
                return foundNews;
            }
            catch (Exception exception)
            {
                Console.WriteLine($"QuickfolioNewsDownloader.ReadRSS() exception: '{exception.Message}'");
                return new List<NewsItem>();
            }
        }
        public void GetQckflStockNews2() // with 13 tickers, it can take 13 * 2 = 26seconds
        {
            foreach (string ticker in m_stockTickers2)
            {
                byte[]? encodedMsgRss = null;
                string rssFeedUrl = string.Format(@"https://feeds.finance.yahoo.com/rss/2.0/headline?s={0}&region=US&lang=en-US", ticker);
                var rss = ReadRSSAsync2(rssFeedUrl, NewsSource.YahooRSS, ticker);
                if (rss.Count > 0)
                    encodedMsgRss = Encoding.UTF8.GetBytes("QckfNews.StockNews:" + Utils.CamelCaseSerialize(rss));
                if (encodedMsgRss != null && WsWebSocket!.State == WebSocketState.Open)
                    WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsgRss, 0, encodedMsgRss.Length), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
        public static void QckflNewsTimer_Elapsed(object? state)    // Timer is coming on a ThreadPool thread
        {
            try
            {
                Utils.Logger.Debug("QckflNewsTimer_Elapsed(). BEGIN");
                if (!isQckflNewsTimerRunning)
                    return; // if it was disabled by another thread in the meantime, we should not waste resources to execute this.

                // Check if the number of Clients > 0. If not => don't do processing and set isQckflNewsTimerRunning = false and don't restart the timer
                if (DashboardClient.g_clients.Count > 0)
                {
                    List<DashboardClient>? g_clientsCpy = null;  // Clone the list, because .Add() can increase its size in another thread
                    lock (DashboardClient.g_clients)
                        g_clientsCpy = new List<DashboardClient>(DashboardClient.g_clients);

                    g_clientsCpy.ForEach(client =>
                    {
                        // to free up resources, send data only if either this is the active tool is this tool or if some seconds has been passed
                        // OnConnectedWsAsync() sleeps for a while if not active tool.
                        TimeSpan timeSinceConnect = DateTime.UtcNow - client.ConnectionTime;
                        if (client.ActivePage != ActivePage.QuickfolioNews && timeSinceConnect < c_initialSleepIfNotActiveToolQn2.Add(TimeSpan.FromMilliseconds(100)))
                            return;

                        client.GetQckflCommonNews2();
                        client.GetQckflStockNews2();
                    });
                } 
                else
                {
                    // isQckflNewsTimerRunning = false;
                    lock (m_qckflNewsTimerLock)
                    {
                        if (isQckflNewsTimerRunning)
                        {
                            Utils.Logger.Info("QckflNewsTimer_Elapsed(). We restart timer.");
                            m_qckflNewsTimer.Change(TimeSpan.FromMilliseconds(m_qckflNewsTimerFrequencyMs), TimeSpan.FromMilliseconds(-1.0));    // runs only once. To avoid that it runs parallel, if first one doesn't finish
                        }
                    }
                }
               
                // do processing...
                // Download common news
                // g_newsDownloader.
                // List<NewsItem> commonNews = GetQckflCommonNews2();
                // company specific news.

                // Sending only commonNews to All clients
                // byte[] encodedMsg = Encoding.UTF8.GetBytes("QckfNews.CommonNews:" + Utils.CamelCaseSerialize(commonNews));

                // Setting the timer if it is needed
                
            }
            catch (Exception e)
            {
                Utils.Logger.Error(e, "QckflNewsTimer_Elapsed() exception.");
                throw;
            }
        }
        public bool OnReceiveWsAsync_QckflNews2(string msgCode, string msgObjStr)
        {
            switch (msgCode)
            {
                case "QckflNews.ReloadQuickfolio":
                    Utils.Logger.Info($"OnReceiveWsAsync_QckflNews(): QckflNews.ReloadQuickfolio:{msgObjStr}");
                    // ReloadQuickfolioMsgArrived();
                    return true;
                default:
                    return false;
            }
        }

    }
}