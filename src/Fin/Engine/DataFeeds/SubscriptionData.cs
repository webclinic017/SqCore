using System;
using QuantConnect.Data;
using QuantConnect.Securities;

namespace QuantConnect.Lean.Engine.DataFeeds
{
    /// <summary>
    /// Store data (either raw or adjusted) and the time at which it should be synchronized
    /// </summary>
    public class SubscriptionData
    {
        /// <summary>
        /// Data
        /// </summary>
        protected BaseData _data;

        /// <summary>
        /// Gets the data
        /// </summary>
        public virtual BaseData Data => _data;

        /// <summary>
        /// Gets the UTC emit time for this data
        /// </summary>
        public DateTime EmitTimeUtc { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionData"/> class
        /// </summary>
        /// <param name="data">The base data</param>
        /// <param name="emitTimeUtc">The emit time for the data</param>
        public SubscriptionData(BaseData data, DateTime emitTimeUtc)
        {
            _data = data;
            EmitTimeUtc = emitTimeUtc;
        }

        /// <summary>
        /// Clones the data, computes the utc emit time and performs exchange round down behavior, storing the result in a new <see cref="SubscriptionData"/> instance
        /// </summary>
        /// <param name="configuration">The subscription's configuration</param>
        /// <param name="exchangeHours">The exchange hours of the security</param>
        /// <param name="offsetProvider">The subscription's offset provider</param>
        /// <param name="data">The data being emitted</param>
        /// <param name="normalizationMode">Specifies how data is normalized</param>
        /// <param name="factor">price scale factor</param>
        /// <returns>A new <see cref="SubscriptionData"/> containing the specified data</returns>
        public static SubscriptionData Create(SubscriptionDataConfig configuration, SecurityExchangeHours exchangeHours, TimeZoneOffsetProvider offsetProvider, BaseData data, DataNormalizationMode normalizationMode, decimal? factor = null)
        {
            if (data == null)
            {
                return null;
            }

            data = data.Clone(data.IsFillForward);
            var emitTimeUtc = offsetProvider.ConvertToUtc(data.EndTime);

            // Let's round down for any data source that implements a time delta between
            // the start of the data and end of the data (usually used with Bars).
            // The time delta ensures that the time collected from `EndTime` has
            // no look-ahead bias, and is point-in-time.
            // When fill forwarding time and endtime might not respect the original ends times, here we will enforce it
            // note we do this after fetching the 'emitTimeUtc' which should use the end time set by the fill forward enumerator
            var barSpan = data.EndTime - data.Time;
            if (barSpan != TimeSpan.Zero)
            {
                if (barSpan != configuration.Increment)
                {
                    // when we detect a difference let's refetch the span in utc using noda time 'ConvertToUtc' that will not take into account day light savings difference
                    // we don't do this always above because it's expensive, only do it if we need to.
                    // Behavior asserted by tests 'FillsForwardBarsAroundDaylightMovementForDifferentResolutions_Algorithm' && 'ConvertToUtcAndDayLightSavings'.
                    // Note: we don't use 'configuration.Increment' because during warmup, if the warmup resolution is set, we will emit data respecting it instead of the 'configuration'
                    barSpan = data.EndTime.ConvertToUtc(configuration.ExchangeTimeZone) - data.Time.ConvertToUtc(configuration.ExchangeTimeZone);
                }
                data.Time = data.Time.ExchangeRoundDownInTimeZone(barSpan, exchangeHours, configuration.DataTimeZone, configuration.ExtendedMarketHours);
            }

            if (factor.HasValue && (configuration.SecurityType != SecurityType.Equity || (factor.Value != 1 || configuration.SumOfDividends != 0)))
            {
                var normalizedData = data.Clone(data.IsFillForward).Normalize(factor.Value, normalizationMode, configuration.SumOfDividends);

                return new PrecalculatedSubscriptionData(configuration, data, normalizedData, normalizationMode, emitTimeUtc);
            }

            return new SubscriptionData(data, emitTimeUtc);
        }
    }
}
