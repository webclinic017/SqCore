using System;
using System.Threading;
using SqCommon;
using System.Collections.Generic;
using System.Text;
using System.Net.WebSockets;
using System.Threading.Tasks;

namespace SqCoreWeb
{
    
    public partial class DashboardClient
    {
        const int m_newsReloadInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
        Timer? m_newsReloadTimer = null;    // separate Timer is needed for each client
        QuickfolioNewsDownloader m_newsDownloader = new QuickfolioNewsDownloader();

        void Ctor_QuickfNews()
        {
            m_newsReloadTimer = new Timer(NewsReloadTimerElapsed, null, m_newsReloadInterval, m_newsReloadInterval);
        }

        public void OnConnectedWsAsync_QckflNews()
        {
            Task.Run(() => // running parallel on a ThreadPool thread
            {
                Thread.CurrentThread.IsBackground = true;  //  thread will be killed when all foreground threads have died, the thread will not keep the application alive.
                Thread.Sleep(TimeSpan.FromSeconds(10)); // Quickfolio News is not the default active panel. It makes sense to send data later to speed up client at the start.
                m_newsDownloader.UpdateStockTickers();
                byte[] encodedMsg = Encoding.UTF8.GetBytes("QckflNewsStockTickerList:" + Utils.CamelCaseSerialize(m_newsDownloader.GetStockTickers()));
                if (WsWebSocket!.State == WebSocketState.Open)
                    WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);

                TriggerQuickfolioNewsDownloader();
            });
        }

        public bool OnReceiveWsAsync_QckflNews(WebSocketReceiveResult? wsResult, string msgCode, string msgObjStr)
        {
            switch (msgCode)
            {
                case "ReloadQuickfolio":
                    Utils.Logger.Info("OnReceiveWsAsync_QckflNews(): ReloadQuickfolio");
                    ReloadQuickfolioMsgArrived();
                    return true;
                default:
                    return false;
            }
        }

        private void TriggerQuickfolioNewsDownloader()
        {
            // we can only send all news to the newly connected p_connId, and not All clients.
            // but that complicates things, because then what if we start to send all news to this fresh client, and 2 seconds later NewsReloadTimerElapsed triggers.
            // so, at the moment, whenever a new client connects, we resend all news to all old clients. If NewsReloadTimerElapsed() triggers during that, we send it twice.
            List<NewsItem> commonNews = m_newsDownloader.GetCommonNews();
            // DashboardPushHubKestrelBckgrndSrv.HubContext?.Clients.All.SendAsync("quickfNewsCommonNewsUpdated", commonNews);

            byte[] encodedMsg = Encoding.UTF8.GetBytes("quickfNewsCommonNewsUpdated:" + Utils.CamelCaseSerialize(commonNews));
            if (WsWebSocket != null && WsWebSocket!.State == WebSocketState.Open)
                WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);

            // m_newsDownloader.GetStockNews(DashboardPushHubKestrelBckgrndSrv.HubContext?.Clients.All);   // with 13 tickers, it can take 13 * 2 = 26seconds

            m_newsDownloader.GetStockNews(DashboardClient.g_clients);   // with 13 tickers, it can take 13 * 2 = 26seconds
        }

        private void NewsReloadTimerElapsed(object? state)
        {
            if (DashboardClient.g_clients.Count > 0) 
            {
                TriggerQuickfolioNewsDownloader();
            }
        }

        public void ReloadQuickfolioMsgArrived() {
            // m_newsDownloader.UpdateStockTickers();
            // DashboardPushHubKestrelBckgrndSrv.HubContext?.Clients.All.SendAsync("QckflNewsStockTickerList", m_newsDownloader.GetStockTickers());
            // m_newsDownloader.GetStockNews(DashboardPushHubKestrelBckgrndSrv.HubContext?.Clients.All);
        }

    }
}