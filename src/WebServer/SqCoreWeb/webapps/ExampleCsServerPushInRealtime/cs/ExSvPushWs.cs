using Microsoft.AspNetCore.Http;
using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace SqCoreWeb
{
    public partial class ExSvPushWs
    {
        // static WebSocket m_webSocket;
        public static Task OnConnectedAsync(HttpContext context, WebSocket webSocket)
        {
            // m_webSocket = webSocket;

            _ = Task.Run(() => // do CPU-bound work on a background thread.  _ is a discard variable in C# 7.0
            {
                byte[] encodedMsg = Encoding.UTF8.GetBytes("msgCode0:" + "OnConnectedAsync() was triggered on server.");
                if (webSocket!.State == WebSocketState.Open) // https://stackoverflow.com/questions/14903887/warning-this-call-is-not-awaited-execution-of-the-current-method-continues
                    _ = webSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None); // _ is a discard variable in C# 7.0

                for (int i = 0; i < 15; i++)
                {
                    string msg = "priceQuoteFromServerCode:" + "(OnConnected) AAPL price is: $" + (new Random().NextDouble() * 1000.0).ToString("0.00");
                    encodedMsg = Encoding.UTF8.GetBytes(msg);
                    if (webSocket!.State == WebSocketState.Open)
                        webSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None).Wait();

                    Thread.Sleep(2000);
                }
            });

            return Task.CompletedTask;
        }

        public static void OnReceiveAsync(HttpContext context, WebSocket webSocket, WebSocketReceiveResult? wsResult, string bufferStr)
        {
            var semicolonInd = bufferStr.IndexOf(':');
            string msgCode = bufferStr.Substring(0, semicolonInd);
            string msgObjStr = bufferStr.Substring(semicolonInd + 1);

            if (msgCode == "startStreamingCode")
            {
                _ = Task.Run(() => // do CPU-bound work on a background thread.  _ is a discard variable in C# 7.0
                {
                    for (int i = 0; i < 15; i++)
                    {
                        string msg = "priceQuoteFromServerCode:" + "TSLA price is: $" + (new Random().NextDouble() * 1000.0).ToString("0.00");
                        var encodedMsg = Encoding.UTF8.GetBytes(msg);
                        if (webSocket!.State == WebSocketState.Open)
                            webSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None).Wait();

                        Thread.Sleep(2000);
                    }
                });
            }
            else
            {
                string msg = "msgCode1:" + $"simple messageReceived:'{bufferStr}'";
                byte[] encodedMsg = Encoding.UTF8.GetBytes(msg);
                if (webSocket!.State == WebSocketState.Open)
                    webSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }

        public static void SendToClient(WebSocket p_webSocket, string p_message) {
            byte[] encodedMsg = Encoding.UTF8.GetBytes(p_message);
            if (p_webSocket!.State == WebSocketState.Open)
                p_webSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);
        }

    }   // class
}