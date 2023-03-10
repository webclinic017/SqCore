using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading;
using Fin.MemDb;
using SqCommon;

namespace SqCoreWeb;

class HandshakePortfMgr // Initial params: keept it small
{
    public string UserName { get; set; } = string.Empty;
}

class PortfolioItemJs
{
    public int Id { get; set; } = -1;
    [JsonPropertyName("n")]
    public string Name { get; set; } = string.Empty;
    [JsonPropertyName("p")]
    public int ParentFolderId { get; set; } = -1;
    [JsonPropertyName("cTime")]
    public string CreationTime { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    [JsonPropertyName("oUsr")]
    public string OwnerUserName { get; set; } = string.Empty;
}

class FolderJs : PortfolioItemJs { }

class PortfolioJs : PortfolioItemJs
{
    [JsonPropertyName("sAcs")]
    public SharedAccess SharedAccess { get; set; } = SharedAccess.Unknown;
    [JsonPropertyName("sUsr")]
    public List<User> SharedUsersWith { get; set; } = new();
    [JsonPropertyName("bCur")]
    public string BaseCurrency { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

public partial class DashboardClient
{
    const int gPortfolioIdOffset = 10000;
    const int gNoUserVirtPortfId = -2;
    // Return from this function very quickly. Do not call any Clients.Caller.SendAsync(), because client will not notice that connection is Connected, and therefore cannot send extra messages until we return here
    public void OnConnectedWsAsync_PortfMgr(bool p_isThisActiveToolAtConnectionInit)
    {
        Utils.RunInNewThread(ignored => // running parallel on a ThreadPool thread, FireAndForget: QueueUserWorkItem [26microsec] is 25% faster than Task.Run [35microsec]
        {
            Utils.Logger.Debug($"OnConnectedWsAsync_PortfMgr BEGIN, Connection from IP: {this.ClientIP} with email '{this.UserEmail}'");
            Thread.CurrentThread.IsBackground = true;  // thread will be killed when all foreground threads have died, the thread will not keep the application alive.

            HandshakePortfMgr handshake = GetHandshakePortfMgr();
            byte[] encodedMsg = Encoding.UTF8.GetBytes("PortfMgr.Handshake:" + Utils.CamelCaseSerialize(handshake));
            if (WsWebSocket!.State == WebSocketState.Open)
                WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);

            // Assuming this tool is not the main Tab page on the client, we delay sending all the data, to avoid making the network and client too busy an unresponsive
            if (!p_isThisActiveToolAtConnectionInit)
                Thread.Sleep(TimeSpan.FromMilliseconds(5000));

            // Portfolio data is big. Don't send it in handshake. Send it 5 seconds later (if it is not the active tool)
            PortfMgrSendFolders();
            PortfMgrSendPortfolios();
        });
    }

    private HandshakePortfMgr GetHandshakePortfMgr()
    {
        return new HandshakePortfMgr() { UserName = User.Username };
    }

    public bool OnReceiveWsAsync_PortfMgr(string msgCode, string msgObjStr)
    {
        switch (msgCode)
        {
            case "PortfMgr.RefreshFolders":
                Utils.Logger.Info($"OnReceiveWsAsync_PortfMgr(): RefreshFolders '{msgObjStr}'");
                PortfMgrSendFolders();
                return true;
            case "PortfMgr.CreateOrEditFolder": // msg: "id:-1,name:DayaTesting,prntFlrId:2,note:tesing"
                Utils.Logger.Info($"OnReceiveWsAsync_PortfMgr(): CreateOrEditFolder '{msgObjStr}'");
                PortfMgrCreateOrEditFolder(msgObjStr);
                PortfMgrSendFolders();
                return true;
            case "PortfMgr.CreatePortfolio": // msg: "DayaTest123,prntFId:15,currency:USD,access:Restricted,type:Trades,note:testing"
                Utils.Logger.Info($"OnReceiveWsAsync_PortfMgr(): CreatePortfolio '{msgObjStr}'");
                PortfMgrCreatePortfolio(msgObjStr);
                PortfMgrSendPortfolios();
                return true;
            case "PortfMgr.DeletePortfolioItem": // msg: "id:5" // if id > 10,000 then it is a PortfolioID otherwise it is the FolderID
                Utils.Logger.Info($"OnReceiveWsAsync_PortfMgr(): DeletePortfolioItem '{msgObjStr}'");
                PortfMgrDeletePortfolioItem(msgObjStr);
                return true;
            default:
                return false;
        }
    }

    public void PortfMgrCreateOrEditFolder(string p_msg) // msg: id:-1,name:TestNesting12,p,p,prntFlrId:16,note:test
    {
        int idStartIdx = p_msg.IndexOf(":");
        int fldNameIdx = (idStartIdx == -1) ? -1 : p_msg.IndexOf(':', idStartIdx + 1);
        int prntFldrIdx = (fldNameIdx == -1) ? -1 : p_msg.IndexOf(":", fldNameIdx + 1);
        int userNoteIdx = prntFldrIdx == -1 ? -1 : p_msg.IndexOf(":", prntFldrIdx + 1);

        int id = Convert.ToInt32(p_msg.Substring(idStartIdx + 1, fldNameIdx - idStartIdx - ",name:".Length));
        string fldName = p_msg.Substring(fldNameIdx + 1, prntFldrIdx - fldNameIdx - ",prntFId:".Length);
        int virtualParentFldId = Convert.ToInt32(p_msg.Substring(prntFldrIdx + 1, userNoteIdx - prntFldrIdx - ",note:".Length));
        string userNote = p_msg[(userNoteIdx + 1)..];

        bool isCreateFolder = id == -1;
        User? user = User;
        int realParentFldId = -1;

        if (isCreateFolder)
        {
            Dictionary<int, PortfolioFolder>.ValueCollection prtfFldrs = MemDb.gMemDb.PortfolioFolders.Values;

            if (virtualParentFldId < -2) // parentFldId < -2 is a virtual UserRoot folder
            {
                if (user.Id == -1 * virtualParentFldId)
                    user = User;
            }
            else if (virtualParentFldId == -2) // parentFldId == -2  Create the new Folder with “"User":-1,"ParentFolder":-2,”
            {
                realParentFldId = virtualParentFldId;
                user = null;
            }
            else if (virtualParentFldId == -1 || virtualParentFldId == 0) // not allowed. Nobody can create folders in the virtual “Shared” folder. That is a flat virtual folder. No folder hierarchy there (like GoogleDrive)
                return; // throw new Exception("Nobody can create folders in virtual Shared folder"); // can we send an exception here - Daya
            else // it is a proper folderID, Create the new Folder under that
            {
                foreach (PortfolioFolder pf in prtfFldrs)
                {
                    realParentFldId = virtualParentFldId;
                    if (pf.Id == realParentFldId)
                    {
                        user = pf.User;
                        break;
                    }
                }
            }
        }
        else
        {
            realParentFldId = virtualParentFldId;
        }

        string errMsg = MemDb.gMemDb.AddOrEditPortfolioFolder(id, user, fldName, realParentFldId, userNote, out PortfolioFolder? p_newItem);
        if (p_newItem == null)
            errMsg = "Folder was not created";

        if (!String.IsNullOrEmpty(errMsg))
        {
            byte[] encodedMsg = Encoding.UTF8.GetBytes("PortfMgr.ErrorToUser:" + errMsg);
            if (WsWebSocket!.State == WebSocketState.Open)
                WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    static int GetVirtualParentFldId(User? p_user, int p_realParentFldId)
    {
        int virtualParentFldId = p_realParentFldId;
        if (p_realParentFldId == -1) // if Portfolio doesn't have a parent folder, then it is in the Root (of either the NonUser or a concrete user)
        {
            if (p_user == null) // if the owner is the NoUser
                virtualParentFldId = gNoUserVirtPortfId;
            else
                virtualParentFldId = -1 * p_user.Id; // If there is a proper user, the Virtual FolderID is the -1 * UserId by our convention.
        }
        return virtualParentFldId;
    }

    // static (int RealParentFldId, User? User) GetRealParentFldId(p_virtualParentFldId) Yet to Develop - Daya
    // {
    // }

    private void PortfMgrSendFolders() // Processing the portfolioFolders based on the visiblity rules
    {
        // Visibility rules for PortfolioFolders:
        // - Normal users don't see other user's PortfolioFolders. They see a virtual folder with their username ('dkodirekka'),
        // a virtual folder 'Shared with me', 'Shared with Anyone', and a virtual folder called 'AllUsers'
        // - Admin users (developers) see all PortfolioFolders of all human users. Each human user (IsHuman) in a virtual folder with their username.
        // And the 'Shared with me', and 'AllUsers" virtual folders are there too.
        Dictionary<int, PortfolioFolder>.ValueCollection prtfFldrs = MemDb.gMemDb.PortfolioFolders.Values;
        Dictionary<int, Portfolio>.ValueCollection prtfs = MemDb.gMemDb.Portfolios.Values;
        // add the virtual folders to prtfFldrsToClient
        List<FolderJs> prtfFldrsToClient = new();
        Dictionary<int, User> virtUsrFldsToSend = new();

        if (User.IsAdmin)
        {
            foreach (PortfolioFolder pf in prtfFldrs) // iterate over all Folders to filter out those users who don't have any folders at all
            {
                if (pf.User != null)
                    virtUsrFldsToSend[pf.User.Id] = pf.User;
            }

            foreach (Portfolio pf in prtfs) // iterate over all Portfolios to filter out those users who don't have any portfolios at all
            {
                if (pf.User != null)
                    virtUsrFldsToSend[pf.User.Id] = pf.User;
            }
        }
        else
        {
            // send only his(User) virtual folder
            virtUsrFldsToSend[User.Id] = User;  // we send the user his main virtual folder even if he has no sub folders at all
        }

        foreach (var kvp in virtUsrFldsToSend)
        {
            User user = kvp.Value;
            FolderJs pfAdminUserJs = new() { Id = -1 * user.Id, Name = user.Username };
            prtfFldrsToClient.Add(pfAdminUserJs);
        }

        FolderJs pfSharedWithMeJs = new() { Id = 0, Name = "Shared" };
        prtfFldrsToClient.Add(pfSharedWithMeJs);

        FolderJs pfAllUsersJs = new() { Id = gNoUserVirtPortfId, Name = "NoUser" };
        prtfFldrsToClient.Add(pfAllUsersJs);

        foreach (PortfolioFolder pf in prtfFldrs)
        {
            bool isSendToUser = User.IsAdmin || (pf.User == null) || (pf.User == User); // (pf.User == null) means UserId = -1, which means its intended for All users
            if (!isSendToUser)
                continue;

            int virtualParentFldId = GetVirtualParentFldId(pf.User, pf.ParentFolderId);

            FolderJs pfJs = new() { Id = pf.Id, Name = pf.Name, ParentFolderId = virtualParentFldId };
            prtfFldrsToClient.Add(pfJs);
        }
        byte[] encodedMsg = Encoding.UTF8.GetBytes("PortfMgr.Folders:" + Utils.CamelCaseSerialize(prtfFldrsToClient));
        if (WsWebSocket!.State == WebSocketState.Open)
            WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);
    }

    private void PortfMgrSendPortfolios()
    {
        Dictionary<int, Portfolio>.ValueCollection prtfs = MemDb.gMemDb.Portfolios.Values;
        List<PortfolioJs> prtfToClient = new();

        foreach (Portfolio pf in prtfs)
        {
            bool isSendToUser = User.IsAdmin || (pf.User == null) || (pf.User == User); // (pf.User == null) means UserId = -1, which means its intended for All users
            if (!isSendToUser)
                continue;

            int virtualParentFldId = GetVirtualParentFldId(pf.User, pf.ParentFolderId);

            PortfolioJs pfJs = new() { Id = pf.Id + gPortfolioIdOffset, Name = pf.Name, ParentFolderId = virtualParentFldId };
            prtfToClient.Add(pfJs);
        }

        byte[] encodedMsg = Encoding.UTF8.GetBytes("PortfMgr.Portfolios:" + Utils.CamelCaseSerialize(prtfToClient));
        if (WsWebSocket!.State == WebSocketState.Open)
            WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);
    }

    public void PortfMgrCreatePortfolio(string p_msg) // "msg - DayaTest123,prntFId:15,currency:USD,access:Restricted,type:Trades,note:testing"
    {
        int pfNameIdx = p_msg.IndexOf(',');
        int prntFldrIdx = (pfNameIdx == -1) ? -1 : p_msg.IndexOf(":", pfNameIdx);
        int currencyIdx = prntFldrIdx == -1 ? -1 : p_msg.IndexOf(":", prntFldrIdx + 1);
        int userAccessIdx = currencyIdx == -1 ? -1 : p_msg.IndexOf(":", currencyIdx + 1);
        int prtfTypeIdx = userAccessIdx == -1 ? -1 : p_msg.IndexOf(":", userAccessIdx + 1);
        int userNoteIdx = prtfTypeIdx == -1 ? -1 : p_msg.IndexOf(":", prtfTypeIdx + 1);
        string pfName = p_msg[..pfNameIdx];
        int parentFldId = Convert.ToInt32(p_msg.Substring(prntFldrIdx + 1, currencyIdx - prntFldrIdx - ",currency:".Length));
        string currency = p_msg.Substring(currencyIdx + 1, userAccessIdx - currencyIdx - ",access:".Length);
        string userAccess = p_msg.Substring(userAccessIdx + 1, prtfTypeIdx - userAccessIdx - ",type:".Length);
        string prtfType = p_msg.Substring(prtfTypeIdx + 1, userNoteIdx - prtfTypeIdx - ",note:".Length);
        string userNote = p_msg[(userNoteIdx + 1)..];

        Dictionary<int, Portfolio>.ValueCollection prtfs = MemDb.gMemDb.Portfolios.Values;
        User? user = User;
        int prntFldIdToSend = -1;
        foreach (Portfolio pf in prtfs)
        {
            if (parentFldId >= -2)
            {
                if (parentFldId == 0) // not allowed. Nobody can create folders in the virtual “Shared” folder. That is a flat virtual folder. No folder hierarchy there (like GoogleDrive)
                    return; // throw new Exception("Nobody can create folders in virtual Shared folder"); // can we send an exception here - Daya
                else if (parentFldId >= 1) // it is a proper folderID, Create the new Folder under that
                {
                    prntFldIdToSend = parentFldId;
                    if (pf.Id == prntFldIdToSend)
                    {
                        user = pf.User;
                        break;
                    }
                }
                else if (parentFldId == -2) // parentFldId == -2  Create the new Folder with “"User":-1,"ParentFolder":-2,”
                {
                    prntFldIdToSend = parentFldId;
                    user = null;
                    break;
                }
            }
            else // parentFldId < -2 is a virtual UserRoot folder. create the new Portfolio with (User: -1 * thisUserId, ParentFolder = -1)
            {
                if (pf.User?.Id == -1 * parentFldId)
                {
                    user = pf.User;
                    break;
                }
            }
        }
        // Utils.Logger.Info($"OnReceiveWsAsync_PortfMgr(): CreatePortfolio '{user}' '{pfName}' '{prntFldIdToSend}' '{userNote}' '{currency}' '{userAccess}' '{prtfType}'");
        MemDb.gMemDb.AddNewPortfolio(user, pfName, prntFldIdToSend, userNote, currency, userAccess, prtfType);
    }

    private void PortfMgrDeletePortfolioItem(string p_msg) // "id:5"
    {
        int idStartInd = p_msg.IndexOf(":");
        if (idStartInd == -1)
            return;
        string idStr = p_msg[(idStartInd + 1)..];
        int id = Convert.ToInt32(idStr);
        bool isFolder = id < gPortfolioIdOffset;
        string errMsg;
        if (isFolder)
            errMsg = MemDb.gMemDb.DeletePortfolioFolder(id);
        else
            errMsg = MemDb.gMemDb.DeletePortfolio(id - gPortfolioIdOffset);

        if (!String.IsNullOrEmpty(errMsg))
        {
            byte[] encodedMsg = Encoding.UTF8.GetBytes("PortfMgr.ErrorToUser:" + errMsg);
            if (WsWebSocket!.State == WebSocketState.Open)
                WsWebSocket.SendAsync(new ArraySegment<Byte>(encodedMsg, 0, encodedMsg.Length), WebSocketMessageType.Text, true, CancellationToken.None);
        }

        if (isFolder)
            PortfMgrSendFolders();
        else
            PortfMgrSendPortfolios();
    }
}