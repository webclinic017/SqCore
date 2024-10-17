﻿using System;
using Newtonsoft.Json;
using QuantConnect.Orders;
using QuantConnect.Parameters;

namespace QuantConnect.Data.Market
{
    /// <summary>
    /// Delisting event of a security
    /// </summary>
    public class Delisting : BaseData
    {
        /// <summary>
        /// Gets the type of delisting, warning or delisted
        /// A <see cref="DelistingType.Warning"/> is sent
        /// </summary>
        [JsonProperty]
        public DelistingType Type { get; private set; }

        /// <summary>
        /// Gets the <see cref="OrderTicket"/> that was submitted to liquidate this position
        /// </summary>
        public OrderTicket Ticket { get; private set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Delisting"/> class
        /// </summary>
        public Delisting()
        {
            DataType = MarketDataType.Auxiliary;
            Type = DelistingType.Delisted;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="Delisting"/> class
        /// </summary>
        /// <param name="symbol">The delisted symbol</param>
        /// <param name="date">The date the symbol was delisted</param>
        /// <param name="price">The final price before delisting</param>
        /// <param name="type">The type of delisting event</param>
        public Delisting(Symbol symbol, DateTime date, decimal price, DelistingType type)
            : this()
        {
            Symbol = symbol;
            Time = date;
            Value = price;
            Type = type;
        }

        /// <summary>
        /// Sets the <see cref="OrderTicket"/> used to liquidate this position
        /// </summary>
        /// <param name="ticket">The ticket that represents the order to liquidate this position</param>
        public void SetOrderTicket(OrderTicket ticket)
        {
            Ticket = ticket;
        }

        /// <summary>
        /// Reader converts each line of the data source into BaseData objects. Each data type creates its own factory method, and returns a new instance of the object
        /// each time it is called.
        /// </summary>
        /// <param name="config">Subscription data config setup object</param>
        /// <param name="line">Line of the source document</param>
        /// <param name="date">Date of the requested data</param>
        /// <param name="isLiveMode">true if we're in live mode, false for backtesting mode</param>
        /// <returns>Instance of the T:BaseData object generated by this line of the CSV</returns>
        public override BaseData Reader(SubscriptionDataConfig config, string line, DateTime date, bool isLiveMode)
        {
            throw new NotImplementedException("This method is not supposed to be called on the Delisting type.");
        }

        /// <summary>
        /// Return the URL string source of the file. This will be converted to a stream
        /// </summary>
        /// <param name="config">Configuration object</param>
        /// <param name="date">Date of this source file</param>
        /// <param name="isLiveMode">true if we're in live mode, false for backtesting mode</param>
        /// <returns>String URL of source file.</returns>
        public override SubscriptionDataSource GetSource(SubscriptionDataConfig config, DateTime date, bool isLiveMode)
        {
            throw new NotImplementedException("This method is not supposed to be called on the Delisting type.");
        }

        /// <summary>
        /// Return a new instance clone of this object, used in fill forward
        /// </summary>
        /// <remarks>
        /// This base implementation uses reflection to copy all public fields and properties
        /// </remarks>
        /// <returns>A clone of the current object</returns>
        public override BaseData Clone()
        {
            return new Delisting(Symbol, Time, Price, Type);
        }

        /// <summary>
        /// Formats a string with the symbol and value.
        /// </summary>
        /// <returns>string - a string formatted as SPY: 167.753</returns>
        public override string ToString()
        {
            var type = Type == DelistingType.Warning ? "Delisting Warning" : "Delisted";
            return $"{type}: {Symbol} {EndTime}";
        }
    }
}
