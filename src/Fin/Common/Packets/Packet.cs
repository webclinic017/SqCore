using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace QuantConnect.Packets
{
    /// <summary>
    /// Base class for packet messaging system
    /// </summary>
    public class Packet
    {
        /// <summary>
        /// Packet type defined by a string enum
        /// </summary>
        [JsonProperty(PropertyName = "eType")]
        public PacketType Type { get; set; } = PacketType.None;

        /// <summary>
        /// User unique specific channel endpoint to send the packets
        /// </summary>
        [JsonProperty(PropertyName = "sChannel")]
        public virtual string Channel { get; set; } = "";

        /// <summary>
        /// Initialize the base class and setup the packet type.
        /// </summary>
        /// <param name="type">PacketType for the class.</param>
        public Packet(PacketType type)
        {
            Channel = "";
            Type = type;
        }
    }

    /// <summary>
    /// Classifications of internal packet system
    /// </summary>
    [JsonConverter(typeof(StringEnumConverter))]
    public enum PacketType
    {
        /// Default, unset:
        None,

        /// Base type for backtest and live work
        AlgorithmNode,

        /// Autocomplete Work Packet
        AutocompleteWork,

        /// Result of the Autocomplete Job:
        AutocompleteResult,

        /// Controller->Backtest Node Packet:
        BacktestNode,

        /// Packet out of backtest node:
        BacktestResult,

        /// API-> Controller Work Packet:
        BacktestWork,

        /// Controller -> Live Node Packet:
        LiveNode,

        /// Live Node -> User Packet:
        LiveResult,

        /// API -> Controller Packet:
        LiveWork,

        /// Node -> User Algo Security Types
        SecurityTypes,

        /// Controller -> User Error in Backtest Settings:
        BacktestError,

        /// Nodes -> User Algorithm Status Packet:
        AlgorithmStatus,

        /// API -> Compiler Work Packet:
        BuildWork,

        /// Compiler -> User Build Success
        BuildSuccess,

        /// Compiler -> User, Compile Error
        BuildError,

        /// Node -> User Algorithm Runtime Error
        RuntimeError,

        /// Error is an internal handled error packet inside users algorithm
        HandledError,

        /// Nodes -> User Log Message
        Log,

        /// Nodes -> User Debug Message
        Debug,

        /// Nodes -> User, Order Update Event
        OrderEvent,

        /// Boolean true/false success
        Success,

        /// History live job packets
        History,

        /// Result from a command
        CommandResult,

        /// Hook from git hub
        GitHubHook,

        /// Documentation result from docs server
        DocumentationResult,

        /// Documentation request to the docs server
        Documentation,

        /// Debug packet generated by Lean
        SystemDebug,

        /// Packet containing insights generated by the algorithm
        AlphaResult,

        /// Alpha API -> Controller packet
        AlphaWork,

        /// Alpha Controller -> Alpha Node packet
        AlphaNode,

        /// Packet containing list of algorithms to run as a regression test
        RegressionAlgorithm,

        /// Packet containing a heartbeat
        AlphaHeartbeat,

        /// Used when debugging to send status updates
        DebuggingStatus,

        /// Optimization Node Packet:
        OptimizationNode,

        /// Optimization Estimate Packet:
        OptimizationEstimate,

        /// Optimization work status update
        OptimizationStatus,

        /// Optimization work result
        OptimizationResult,

        /// Aggregated packets
        Aggregated
    }
}
