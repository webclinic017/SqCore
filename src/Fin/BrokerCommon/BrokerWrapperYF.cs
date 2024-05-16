using System;
using System.Collections.Generic;
using IBApi;

namespace Fin.BrokerCommon;

public class BrokerWrapperYF : IBrokerWrapper
{
    bool m_isConnected = false;
    public string IbAccountsList
    {
        get { return string.Empty; }
        set { }
    }

    public void accountDownloadEnd(string account)
    {
        throw new NotImplementedException();
    }

    public void accountSummary(int reqId, string account, string tag, string value, string currency)
    {
        throw new NotImplementedException();
    }

    public void accountSummaryEnd(int reqId)
    {
        throw new NotImplementedException();
    }

    public void accountUpdateMulti(int requestId, string account, string modelCode, string key, string value, string currency)
    {
        throw new NotImplementedException();
    }

    public void accountUpdateMultiEnd(int requestId)
    {
        throw new NotImplementedException();
    }

    public void bondContractDetails(int reqId, ContractDetails contract)
    {
        throw new NotImplementedException();
    }

    public void CancelAccountSummary(int p_reqId)
    {
        throw new NotImplementedException();
    }

    public void CancelMktData(int p_marketDataId)
    {
        throw new NotImplementedException();
    }

    public void commissionReport(CommissionReport commissionReport)
    {
        throw new NotImplementedException();
    }

    public void completedOrder(Contract contract, Order order, OrderState orderState)
    {
        throw new NotImplementedException();
    }

    public void completedOrdersEnd()
    {
        throw new NotImplementedException();
    }

    public bool Connect(GatewayId p_gatewayUser, string host, int p_socketPort, int p_brokerConnectionClientID)
    {
        m_isConnected = true;
        return true;
    }

    public void connectAck()
    {
        throw new NotImplementedException();
    }

    public void connectionClosed()
    {
        throw new NotImplementedException();
    }

    public void contractDetails(int reqId, ContractDetails contractDetails)
    {
        throw new NotImplementedException();
    }

    public void contractDetailsEnd(int reqId)
    {
        throw new NotImplementedException();
    }

    public void currentTime(long time)
    {
        throw new NotImplementedException();
    }

    public void deltaNeutralValidation(int reqId, DeltaNeutralContract deltaNeutralContract)
    {
        throw new NotImplementedException();
    }

    public void Disconnect()
    {
        m_isConnected = false;
    }

    public void displayGroupList(int reqId, string groups)
    {
        throw new NotImplementedException();
    }

    public void displayGroupUpdated(int reqId, string contractInfo)
    {
        throw new NotImplementedException();
    }

    public void error(Exception e)
    {
        throw new NotImplementedException();
    }

    public void error(string str)
    {
        throw new NotImplementedException();
    }

    public void error(int id, int errorCode, string errorMsg, string advancedOrderRejectJson)
    {
        throw new NotImplementedException();
    }

    public void execDetails(int reqId, Contract contract, Execution execution)
    {
        throw new NotImplementedException();
    }

    public void execDetailsEnd(int reqId)
    {
        throw new NotImplementedException();
    }

    public void familyCodes(FamilyCode[] familyCodes)
    {
        throw new NotImplementedException();
    }

    public void fundamentalData(int reqId, string data)
    {
        throw new NotImplementedException();
    }

    public bool GetAlreadyStreamedPrice(Contract p_contract, ref Dictionary<int, PriceAndTime> p_quotes)
    {
        throw new NotImplementedException();
    }

    public bool GetRealOrderExecutionInfo(int p_realOrderId, ref OrderStatus p_realOrderStatus, ref decimal p_realExecutedVolume, ref double p_realExecutedAvgPrice, ref DateTime p_execptionTime, bool p_isSimulatedTrades)
    {
        throw new NotImplementedException();
    }

    public void headTimestamp(int reqId, string headTimestamp)
    {
        throw new NotImplementedException();
    }

    public void histogramData(int reqId, HistogramEntry[] data)
    {
        throw new NotImplementedException();
    }

    public void historicalData(int reqId, Bar bar)
    {
        throw new NotImplementedException();
    }

    public void historicalDataEnd(int reqId, string start, string end)
    {
        throw new NotImplementedException();
    }

    public void historicalDataUpdate(int reqId, Bar bar)
    {
        throw new NotImplementedException();
    }

    public void historicalNews(int requestId, string time, string providerCode, string articleId, string headline)
    {
        throw new NotImplementedException();
    }

    public void historicalNewsEnd(int requestId, bool hasMore)
    {
        throw new NotImplementedException();
    }

    public void historicalTicks(int reqId, HistoricalTick[] ticks, bool done)
    {
        throw new NotImplementedException();
    }

    public void historicalTicksBidAsk(int reqId, HistoricalTickBidAsk[] ticks, bool done)
    {
        throw new NotImplementedException();
    }

    public void historicalTicksLast(int reqId, HistoricalTickLast[] ticks, bool done)
    {
        throw new NotImplementedException();
    }

    public bool IsConnected()
    {
        return m_isConnected;
    }

    public void managedAccounts(string accountsList)
    {
        throw new NotImplementedException();
    }

    public void marketDataType(int reqId, int marketDataType)
    {
        throw new NotImplementedException();
    }

    public void marketRule(int marketRuleId, PriceIncrement[] priceIncrements)
    {
        throw new NotImplementedException();
    }

    public void mktDepthExchanges(DepthMktDataDescription[] depthMktDataDescriptions)
    {
        throw new NotImplementedException();
    }

    public void newsArticle(int requestId, int articleType, string articleText)
    {
        throw new NotImplementedException();
    }

    public void newsProviders(NewsProvider[] newsProviders)
    {
        throw new NotImplementedException();
    }

    public void nextValidId(int orderId)
    {
        throw new NotImplementedException();
    }

    public void openOrder(int orderId, Contract contract, Order order, OrderState orderState)
    {
        throw new NotImplementedException();
    }

    public void openOrderEnd()
    {
        throw new NotImplementedException();
    }

    public void orderBound(long orderId, int apiClientId, int apiOrderId)
    {
        throw new NotImplementedException();
    }

    public void orderStatus(int orderId, string status, decimal filled, decimal remaining, double avgFillPrice, int permId, int parentId, double lastFillPrice, int clientId, string whyHeld, double mktCapPrice)
    {
        throw new NotImplementedException();
    }

    public int PlaceOrder(Contract p_contract, TransactionType p_transactionType, decimal p_volume, OrderExecution p_orderExecution, OrderTimeInForce p_orderTif, double? p_limitPrice, double? p_stopPrice, double p_estimatedPrice, bool p_isSimulatedTrades)
    {
        throw new NotImplementedException();
    }

    public void pnl(int reqId, double dailyPnL, double unrealizedPnL, double realizedPnL)
    {
        throw new NotImplementedException();
    }

    public void pnlSingle(int reqId, decimal pos, double dailyPnL, double unrealizedPnL, double realizedPnL, double value)
    {
        throw new NotImplementedException();
    }

    public void position(string account, Contract contract, decimal pos, double avgCost)
    {
        throw new NotImplementedException();
    }

    public void positionEnd()
    {
        throw new NotImplementedException();
    }

    public void positionMulti(int requestId, string account, string modelCode, Contract contract, decimal pos, double avgCost)
    {
        throw new NotImplementedException();
    }

    public void positionMultiEnd(int requestId)
    {
        throw new NotImplementedException();
    }

    public void realtimeBar(int reqId, long date, double open, double high, double low, double close, decimal volume, decimal wap, int count)
    {
        throw new NotImplementedException();
    }

    public void receiveFA(int faDataType, string faXmlData)
    {
        throw new NotImplementedException();
    }

    public int ReqAccountSummary()
    {
        throw new NotImplementedException();
    }

    public bool ReqHistoricalData(DateTime p_endDateTime, int p_lookbackWindowSize, string p_whatToShow, Contract p_contract, out List<QuoteData>? p_quotes)
    {
        throw new NotImplementedException();
    }

    public int ReqMktDataStream(Contract p_contract, string p_genericTickList = "", bool p_snapshot = false, MktDataSubscription.MktDataArrivedFunc? p_mktDataArrivedFunc = null, MktDataSubscription.MktDataErrorFunc? p_mktDataErrorFunc = null, MktDataSubscription.MktDataTickGenericFunc? p_mktDataTickGenericFunc = null, MktDataSubscription.MktDataTypeFunc? p_mktDataTypeFunc = null, MktDataSubscription.MktDataTickOptionComputationFunc? p_mktDataTickOptionComputationFunc = null)
    {
        throw new NotImplementedException();
    }

    public void ReqPositions()
    {
        throw new NotImplementedException();
    }

    public void rerouteMktDataReq(int reqId, int conId, string exchange)
    {
        throw new NotImplementedException();
    }

    public void rerouteMktDepthReq(int reqId, int conId, string exchange)
    {
        throw new NotImplementedException();
    }

    public void scannerData(int reqId, int rank, ContractDetails contractDetails, string distance, string benchmark, string projection, string legsStr)
    {
        throw new NotImplementedException();
    }

    public void scannerDataEnd(int reqId)
    {
        throw new NotImplementedException();
    }

    public void scannerParameters(string xml)
    {
        throw new NotImplementedException();
    }

    public void securityDefinitionOptionParameter(int reqId, string exchange, int underlyingConId, string tradingClass, string multiplier, HashSet<string> expirations, HashSet<double> strikes)
    {
        throw new NotImplementedException();
    }

    public void securityDefinitionOptionParameterEnd(int reqId)
    {
        throw new NotImplementedException();
    }

    public void smartComponents(int reqId, Dictionary<int, KeyValuePair<string, char>> theMap)
    {
        throw new NotImplementedException();
    }

    public void softDollarTiers(int reqId, SoftDollarTier[] tiers)
    {
        throw new NotImplementedException();
    }

    public void symbolSamples(int reqId, ContractDescription[] contractDescriptions)
    {
        throw new NotImplementedException();
    }

    public void tickByTickAllLast(int reqId, int tickType, long time, double price, decimal size, TickAttribLast tickAttriblast, string exchange, string specialConditions)
    {
        throw new NotImplementedException();
    }

    public void tickByTickBidAsk(int reqId, long time, double bidPrice, double askPrice, decimal bidSize, decimal askSize, TickAttribBidAsk tickAttribBidAsk)
    {
        throw new NotImplementedException();
    }

    public void tickByTickMidPoint(int reqId, long time, double midPoint)
    {
        throw new NotImplementedException();
    }

    public void tickEFP(int tickerId, int tickType, double basisPoints, string formattedBasisPoints, double impliedFuture, int holdDays, string futureLastTradeDate, double dividendImpact, double dividendsToLastTradeDate)
    {
        throw new NotImplementedException();
    }

    public void tickGeneric(int tickerId, int field, double value)
    {
        throw new NotImplementedException();
    }

    public void tickNews(int tickerId, long timeStamp, string providerCode, string articleId, string headline, string extraData)
    {
        throw new NotImplementedException();
    }

    public void tickOptionComputation(int tickerId, int field, int tickAttrib, double impliedVolatility, double delta, double optPrice, double pvDividend, double gamma, double vega, double theta, double undPrice)
    {
        throw new NotImplementedException();
    }

    public void tickPrice(int tickerId, int field, double price, TickAttrib attribs)
    {
        throw new NotImplementedException();
    }

    public void tickReqParams(int tickerId, double minTick, string bboExchange, int snapshotPermissions)
    {
        throw new NotImplementedException();
    }

    public void tickSize(int tickerId, int field, decimal size)
    {
        throw new NotImplementedException();
    }

    public void tickSnapshotEnd(int tickerId)
    {
        throw new NotImplementedException();
    }

    public void tickString(int tickerId, int field, string value)
    {
        throw new NotImplementedException();
    }

    public void updateAccountTime(string timestamp)
    {
        throw new NotImplementedException();
    }

    public void updateAccountValue(string key, string value, string currency, string accountName)
    {
        throw new NotImplementedException();
    }

    public void updateMktDepth(int tickerId, int position, int operation, int side, double price, decimal size)
    {
        throw new NotImplementedException();
    }

    public void updateMktDepthL2(int tickerId, int position, string marketMaker, int operation, int side, double price, decimal size, bool isSmartDepth)
    {
        throw new NotImplementedException();
    }

    public void updateNewsBulletin(int msgId, int msgType, string message, string origExchange)
    {
        throw new NotImplementedException();
    }

    public void updatePortfolio(Contract contract, decimal position, double marketPrice, double marketValue, double averageCost, double unrealizedPNL, double realizedPNL, string accountName)
    {
        throw new NotImplementedException();
    }

    public void verifyAndAuthCompleted(bool isSuccessful, string errorText)
    {
        throw new NotImplementedException();
    }

    public void verifyAndAuthMessageAPI(string apiData, string xyzChallenge)
    {
        throw new NotImplementedException();
    }

    public void verifyCompleted(bool isSuccessful, string errorText)
    {
        throw new NotImplementedException();
    }

    public void verifyMessageAPI(string apiData)
    {
        throw new NotImplementedException();
    }

    public bool WaitOrder(int p_realOrderId, bool p_isSimulatedTrades)
    {
        throw new NotImplementedException();
    }

    public virtual void replaceFAEnd(int reqId, string text)
    {
        throw new NotImplementedException();
    }

    public virtual void wshMetaData(int reqId, string dataJson)
    {
        throw new NotImplementedException();
    }

    public virtual void wshEventData(int reqId, string dataJson)
    {
        throw new NotImplementedException();
    }

    public virtual void historicalSchedule(int reqId, string startDateTime, string endDateTime, string timeZone, HistoricalSession[] sessions)
    {
        throw new NotImplementedException();
    }

    public virtual void userInfo(int reqId, string whiteBrandingId)
    {
        throw new NotImplementedException();
    }
}