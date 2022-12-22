﻿using System;
using System.Collections.Generic;
using QuantConnect.Data;
using QuantConnect.Securities;

namespace QuantConnect.Interfaces
{
    /// <summary>
    /// Reduced interface which allows setting and accessing
    /// price properties for a <see cref="Security"/>
    /// </summary>
    public interface ISecurityPrice
    {
        /// <summary>
        /// Get the current value of the security.
        /// </summary>
        decimal Price { get; }

        /// <summary>
        /// If this uses trade bar data, return the most recent close.
        /// </summary>
        decimal Close { get; }

        /// <summary>
        /// Access to the volume of the equity today
        /// </summary>
        decimal Volume { get; }

        /// <summary>
        /// Gets the most recent bid price if available
        /// </summary>
        decimal BidPrice { get; }

        /// <summary>
        /// Gets the most recent bid size if available
        /// </summary>
        decimal BidSize { get; }

        /// <summary>
        /// Gets the most recent ask price if available
        /// </summary>
        decimal AskPrice { get; }

        /// <summary>
        /// Gets the most recent ask size if available
        /// </summary>
        decimal AskSize { get; }

        /// <summary>
        /// Access to the open interest of the security today
        /// </summary>
        long OpenInterest { get; }

        /// <summary>
        /// <see cref="Symbol"/> for the asset.
        /// </summary>
        Symbol Symbol { get; }

        /// <summary>
        /// Update any security properties based on the latest market data and time
        /// </summary>
        /// <param name="data">New data packet from LEAN</param>
        void SetMarketPrice(BaseData data);

        /// <summary>
        /// Updates all of the security properties, such as price/OHLCV/bid/ask based
        /// on the data provided. Data is also stored into the security's data cache
        /// </summary>
        /// <param name="data">The security update data</param>
        /// <param name="dataType">The data type</param>
        /// <param name="containsFillForwardData">Flag indicating whether
        /// <paramref name="data"/> contains any fill forward bar or not</param>
        void Update(IReadOnlyList<BaseData> data, Type dataType, bool? containsFillForwardData);

        /// <summary>
        /// Get the last price update set to the security.
        /// </summary>
        /// <returns>BaseData object for this security</returns>
        BaseData GetLastData();
    }
}
