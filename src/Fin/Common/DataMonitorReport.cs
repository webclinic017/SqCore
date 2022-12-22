using Newtonsoft.Json;
using QuantConnect.Interfaces;
using QuantConnect.Util;
using System;
using System.Collections.Generic;
using System.Linq;

namespace QuantConnect
{
    /// <summary>
    /// Report generated by the <see cref="IDataMonitor"/> class that contains information about data requests
    /// </summary>
    public class DataMonitorReport
    {
        /// <summary>
        /// Gets the number of data files that were requested and successfully fetched
        /// </summary>
        [JsonProperty(PropertyName = "succeeded-data-requests-count")]
        public long SucceededDataRequestsCount { get; set; }

        /// <summary>
        /// Gets the number of data files that were requested but could not be fetched
        /// </summary>
        [JsonProperty(PropertyName = "failed-data-requests-count")]
        public long FailedDataRequestsCount { get; set; }

        /// <summary>
        /// Gets the number of universe data files that were requested and successfully fetched
        /// </summary>
        [JsonProperty(PropertyName = "succeeded-universe-data-requests-count")]
        public long SucceededUniverseDataRequestsCount { get; set; }

        /// <summary>
        /// Gets the number of universe data files that were requested but could not be fetched
        /// </summary>
        [JsonProperty(PropertyName = "failed-universe-data-requests-count")]
        public long FailedUniverseDataRequestsCount { get; set; }

        /// <summary>
        /// Gets the number of data files that were requested
        /// </summary>
        [JsonProperty(PropertyName = "total-data-requests-count")]
        public long TotalRequestsCount
        {
            get { return SucceededDataRequestsCount + FailedDataRequestsCount; }
        }

        /// <summary>
        /// Fets the percentage of data requests that could not be satisfied
        /// </summary>
        [JsonProperty(PropertyName = "failed-data-requests-percentage")]
        public double FailedDataRequestsPercentage
        {
            get { return GetPercentage(TotalRequestsCount, FailedDataRequestsCount); }
        }

        /// <summary>
        /// Gets the number of universe data files that were requested
        /// </summary>
        [JsonProperty(PropertyName = "total-universe-data-requests-count")]
        public long TotalUniverseDataRequestsCount
        {
            get { return SucceededUniverseDataRequestsCount + FailedUniverseDataRequestsCount; }
        }

        /// <summary>
        /// Fets the percentage of universe data requests that could not be satisfied
        /// </summary>
        [JsonProperty(PropertyName = "failed-universe-data-requests-percentage")]
        public double FailedUniverseDataRequestsPercentage
        {
            get { return GetPercentage(TotalUniverseDataRequestsCount, FailedUniverseDataRequestsCount); }
        }

        /// <summary>
        /// Rates at which data requests were made per second
        /// </summary>
        [JsonProperty(PropertyName = "data-request-rates")]
        public IReadOnlyList<double> DataRequestRates { get; set; }

        /// <summary>
        /// Initializes an empty instance of the <see cref="DataMonitorReport"/> class
        /// </summary>
        public DataMonitorReport()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="DataMonitorReport"/> class
        /// </summary>
        /// <param name="succeededDataRequestsCount">Number of data paths that were requested and successfuly served</param>
        /// <param name="failedDataRequestsCount">Number of data paths that were requested but could not be served</param>
        /// <param name="succeededUniverseDataRequestsCount">Number of universe data paths that were requested and successfuly served</param>
        /// <param name="failedUniverseDataRequestsCount">Number of universe data paths that were requested but could not be served</param>
        /// <param name="dataRequestRates">Rates at which data requests were made per second</param>
        public DataMonitorReport(long succeededDataRequestsCount, 
            long failedDataRequestsCount, 
            long succeededUniverseDataRequestsCount, 
            long failedUniverseDataRequestsCount, 
            IReadOnlyList<double> dataRequestRates)
        {
            SucceededDataRequestsCount = succeededDataRequestsCount;
            FailedDataRequestsCount = failedDataRequestsCount;
            SucceededUniverseDataRequestsCount = succeededUniverseDataRequestsCount;
            FailedUniverseDataRequestsCount = failedUniverseDataRequestsCount;
            DataRequestRates = dataRequestRates;
        }
        
        private static double GetPercentage(long total, long value)
        {
            if (total == 0)
            {
                return 0;
            }

            return Math.Round(value / (double)total * 100);
        }
    }
}
