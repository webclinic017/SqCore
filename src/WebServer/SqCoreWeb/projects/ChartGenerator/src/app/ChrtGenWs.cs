using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Diagnostics;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Fin.MemDb;
using Microsoft.AspNetCore.Http;
using QuantConnect;
using SqCommon;

namespace SqCoreWeb;

// these members has to be C# properties, not simple data member tags. Otherwise it will not serialize to client.
class HandshakeMessageChrtGen
{ // General params for the aggregate Dashboard. These params should be not specific to smaller tools, like HealthMonitor, CatalystSniffer, QuickfolioNews
    public string Email { get; set; } = string.Empty;
    public int AnyParam { get; set; } = 75;
}

class SqLog // TODO: move it to somewhere global.
{
    public string Message { get; set; } = string.Empty;
}

class ChrtGenPrtfRunResultJs // ChartGenerator doesn't need the Portfolio Positions data
{
    public int PrtfId { get; set; } = 1; // need this to identify the data of portfolios
    public PortfolioRunResultStatistics Pstat { get; set; } = new();
    public ChartPointValues Chart { get; set; } = new();
    public ChartResolution ChartResolution { get; set; } = ChartResolution.Daily;
}

class BmrkHistory
{
    public string SqTicker { get; set; } = string.Empty;
    public PriceHistoryJs HistPrices { get; set; } = new();
}

class ChrtGenBacktestResult
{
    public List<ChrtGenPrtfRunResultJs> PfRunResults { get; set; } = new();
    public List<BmrkHistory> BmrkHistories { get; set; } = new();
    public List<SqLog> Logs { get; set; } = new();
    public int ServerBacktestTimeMs { get; set; } = -1;
}

public class ChrtGenWs
{
    public static async Task OnWsConnectedAsync(HttpContext context, WebSocket webSocket)
    {
        Utils.Logger.Debug($"ChrtGenWs.OnConnectedAsync()) BEGIN");
        // context.Request comes as: 'wss://' + document.location.hostname + '/ws/chrtgen?pids=1,2&bmrks=QQQ,SPY'
        string? queryStr = context.Request.QueryString.Value;
        RunBacktests(queryStr, webSocket);
        var userEmailClaim = context?.User?.Claims?.FirstOrDefault(p => p.Type == @"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress");
        var email = userEmailClaim?.Value ?? "unknown@gmail.com";

        // https://stackoverflow.com/questions/24450109/how-to-send-receive-messages-through-a-web-socket-on-windows-phone-8-using-the-c
        var msgObj = new HandshakeMessageChrtGen() { Email = email };
        byte[] encodedMsg = Encoding.UTF8.GetBytes("OnConnected:" + Utils.CamelCaseSerialize(msgObj));
        if (webSocket.State == WebSocketState.Open)
            await webSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);    // takes 0.635ms
    }

    public static void OnWsReceiveAsync(/* HttpContext context, WebSocketReceiveResult? result, */ WebSocket webSocket,  string bufferStr)
    {
        _ = webSocket; // StyleCop SA1313 ParameterNamesMustBeginWithLowerCaseLetter. They won't fix. Recommended solution for unused parameters, instead of the discard (_1) parameters

        var semicolonInd = bufferStr.IndexOf(':');
        string msgCode = bufferStr[..semicolonInd];
        string msgObjStr = bufferStr[(semicolonInd + 1)..];

        switch (msgCode)
        {
            case "RunBacktest":
                Utils.Logger.Info($"ChrtGen.OnWsReceiveAsync(): RunBacktest: '{msgObjStr}'");
                RunBacktests(msgObjStr, webSocket);
                break;
            default:
                Utils.Logger.Info($"ChrtGen.OnWsReceiveAsync(): Unrecognized message from client, {msgCode},{msgObjStr}");
                break;
        }
    }

    public static void RunBacktests(string? p_msg, WebSocket webSocket) // msg: ?pids=1,2&bmrks=QQQ,SPY
    {
        Stopwatch stopwatch = Stopwatch.StartNew(); // Stopwatch to capture the start time
        ChrtGenBacktestResult chrtGenBacktestResult = new();
        string? errMsg = null;
        if (p_msg == null)
            errMsg = $"Error. msg from the client is null";

        // Step 1: generate the Portfolios. Can run in a multithreaded way.
        NameValueCollection query = HttpUtility.ParseQueryString(p_msg!); // Parse the query string from the input message
        string? pidsStr = query.Get("pids"); // Get the value of the "pids" parameter from the query string
        if (pidsStr == null)
            errMsg = $"Error. pidsStr from the client is null";

        List<Portfolio> lsPrtf = new(); // Create a new list to store the portfolios
        foreach (string pidStr in pidsStr!.Split(',', StringSplitOptions.RemoveEmptyEntries))
        {
            if (MemDb.gMemDb.Portfolios.TryGetValue(Convert.ToInt32(pidStr), out Portfolio? prtf))
            {
                 Console.WriteLine($"Portfolio Name: '{prtf.Name}'");
                 lsPrtf.Add(prtf);
            }
        }

        DateTime minStartDate = DateTime.Today; // initialize currentDate to the Today's Date
        List<ChrtGenPrtfRunResultJs> chrtGenPrtfRunResultJs = new();
        // Step 2: Filling the chrtGenPrtfRunResultJs to a list.
        for (int i = 0; i < lsPrtf.Count; i++)
        {
            errMsg = lsPrtf[i].GetPortfolioRunResult(out PortfolioRunResultStatistics stat, out List<ChartPoint> pv, out List<PortfolioPosition> prtfPos, out ChartResolution chartResolution);
            ChartPointValues chartVal = new();
            PortfolioRunResultStatistics pStat = new();

            if (errMsg == null)
            {
                // Step 3: Filling the ChartPoint Dates and Values to a list. A very condensed format. Dates are separated into its ChartDate List.
                // Instead of the longer [{"ChartDate": 1641013200, "Value": 101665}, {"ChartDate": 1641013200, "Value": 101665}, {"ChartDate": 1641013200, "Value": 101665}]
                // we send a shorter: { ChartDate: [1641013200, 1641013200, 1641013200], Value: [101665, 101665, 101665] }

                foreach (var item in pv)
                {
                    DateTime itemDate = DateTimeOffset.FromUnixTimeSeconds(item.x).DateTime.Date;
                    if (itemDate < minStartDate)
                        minStartDate = itemDate; // MinStart Date of the portfolio's
                    chartVal.Dates.Add(item.x);
                    chartVal.Values.Add((int)item.y);
                }

                // Step 4: Filling the Stats data
                pStat.StartPortfolioValue = stat.StartPortfolioValue;
                pStat.EndPortfolioValue = stat.EndPortfolioValue;
                pStat.TotalReturn = stat.TotalReturn;
                pStat.CAGR = stat.CAGR;
                pStat.MaxDD = stat.MaxDD;
                pStat.SharpeRatio = stat.SharpeRatio;
                pStat.StDev = stat.StDev;
                pStat.Ulcer = stat.Ulcer;
                pStat.TradingDays = stat.TradingDays;
                pStat.NTrades = stat.NTrades;
                pStat.WinRate = stat.WinRate;
                pStat.LossRate = stat.LossRate;
                pStat.Sortino = stat.Sortino;
                pStat.Turnover = stat.Turnover;
                pStat.LongShortRatio = stat.LongShortRatio;
                pStat.Fees = stat.Fees;
                pStat.BenchmarkCAGR = stat.BenchmarkCAGR;
                pStat.BenchmarkMaxDD = stat.BenchmarkMaxDD;
                pStat.CorrelationWithBenchmark = stat.CorrelationWithBenchmark;
            }
            _ = prtfPos; // To avoid the compiler Warning "Unnecessary assigment of a value" for unusued variables.
            // Step 5: Filling the data in chrtGenPrtfRunResultJs
            chrtGenPrtfRunResultJs.Add(new ChrtGenPrtfRunResultJs { PrtfId = lsPrtf[i].Id, Pstat = pStat, Chart = chartVal, ChartResolution = chartResolution });
        }

        // Next Steps

        // Step 2: Wait until portfolios complete, and calculate the minimum startDate of the participating portfolios / calculating minStartDate. Somehow, comment it into the code. Or just program that IF early, and write a comment on the line of that IF.

        // Step 3: using minStartDate get the history for all benchmarks

        // ******BENCHMARK************
        // Step1: Processing the message to extract the benchmark tickers
        string? bmrksStr = query.Get("bmrks");
        bmrksStr ??= "SPY"; // sending default value as SPY
        List<BmrkHistory> bmrkHistories = new();
        if(errMsg == null)
        {
            foreach (string bmrkStr in bmrksStr!.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                errMsg = Portfolio.GetBmrksHistoricalResults(bmrkStr, minStartDate, out PriceHistoryJs histPrcs);
                if(errMsg == null)
                {
                    bmrkHistories.Add(new BmrkHistory { SqTicker = bmrkStr, HistPrices = histPrcs });
                }
                else
                    errMsg = $"Error. Benchmark Tickers {bmrkStr} not found in DB";
            }
        }

        // Step 4: send back the result

        stopwatch.Stop(); // Stopwatch to capture the end time
        chrtGenBacktestResult.PfRunResults = chrtGenPrtfRunResultJs; // Set the portfolio run results in the backtest result object
        chrtGenBacktestResult.BmrkHistories = bmrkHistories;
        chrtGenBacktestResult.ServerBacktestTimeMs = (int)stopwatch.ElapsedMilliseconds; // Set the server backtest time in milliseconds

        byte[] encodedMsg = Encoding.UTF8.GetBytes("BacktestResults:" + Utils.CamelCaseSerialize(chrtGenBacktestResult));
        if (webSocket!.State == WebSocketState.Open)
            webSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);

        if (errMsg != null)
        {
            byte[] encodedErrMsg = Encoding.UTF8.GetBytes("ErrorToUser:" + errMsg);
            if (webSocket!.State == WebSocketState.Open)
                webSocket.SendAsync(new ArraySegment<Byte>(encodedErrMsg, 0, encodedErrMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    public static void OnWsClose(WebSocket webSocket)
    {
        _ = webSocket; // StyleCop SA1313 ParameterNamesMustBeginWithLowerCaseLetter. They won't fix. Recommended solution for unused parameters, instead of the discard (_1) parameters
    }
}