import ws from "ws";
import base64 from "base64-js";
import { Writable, Readable } from "stream";
import { commandAnalysis } from "../core/commandExec";
import { CommandAnalysisRes, UIStreamAgg } from "../types/commandRun.d";
import { NetworkSession } from "../types/networkTTY/networkSession";
import { baseContextBuilder } from "../baseContext";
import { setBootstrapMode } from "../globalInfo";
import { BootstrapMode, CommandState } from "../types/bootstrap.d";
import { sentenceAnalysis } from "../functions/commandAnalysis";
import { loginAuthReqCode, sendCommandReqCode } from "../core/networtBootstrap";
import { StringDecoder } from "string_decoder";
import {
    buildNetworkResAuthPackage,
    buildNetworkViewPackage,
} from "../functions/network/buildNetworkPackage";
import { loger } from "../log";
import { writeToStream } from "../functions/streamUtil";
import { buildTTYTips } from "../functions/ttyTips";


/// global state 
const wsServer = new ws.Server({ host: "0.0.0.0", port: 8086 });
const globalConnectState = new Map<ws, NetworkSession>();
const serverPasswd = "helloworld";

/// rebuild  connStream in connstate
function rebuildStream(conn: ws): UIStreamAgg {
    const outStreamElem = new Writable({
        write: (recvData, encode, callback) => {
            loger.debug(recvData);
            if (recvData.toString != undefined) {
                const recvDataString: string = recvData.toString();
                const sendPackageString = JSON.stringify(
                    buildNetworkViewPackage(recvDataString)
                );
                conn.send(sendPackageString);
            } else {
                loger.error("Recv no transform to string data");
            }
            callback();
        },
    });
    const inStreamElem = new Readable({
        read: (size) => {
            null;
        },
    });

    const errStreamElem = new Writable({
        write: (recvData, encode, callback) => {
            if (recvData.toString != undefined) {
                const recvDataString: string = recvData.toString();
                const sendPackageString = JSON.stringify(
                    buildNetworkViewPackage(recvDataString)
                );
                conn.send(sendPackageString);
            } else {
                loger.warning(`Recv no transform to string data`);
            }
            callback();
        },
    });
    const returnStreamAgg = {
        outStream: outStreamElem,
        inStream: inStreamElem,
        errStream: errStreamElem,
    };
    const getConnState = globalConnectState.get(conn);
    if (getConnState) {
        getConnState.uiStreamAgg = returnStreamAgg;
    }
    return returnStreamAgg;
}

/// login on function
function wsLoginRun(dataBox: networkBootstrapPackage, conn: ws) {
    const authPackage = dataBox.carry as loginAuth;
    if (authPackage.passwd == serverPasswd) {
        globalConnectState.set(conn, {
            uiStreamAgg: rebuildStream(conn),
            context: baseContextBuilder(),
            authState: true,
            commandState: CommandState.stop,
            inputCache: "",
            conn: conn,
        });
        conn.send(JSON.stringify(buildNetworkResAuthPackage(true)));
    } else {
        conn.send(JSON.stringify(buildNetworkResAuthPackage(false)));
    }
}

/// wscommand run on function
const wsCommandRunSonState = {
    outInCommandRunning: (opt: {
        connState: NetworkSession;
        sendCommandRaw: sendCommand;
    }) => {
        const { sendCommandRaw, connState } = opt;
        const utf8decoder = new StringDecoder();
        sendCommandRaw.command = utf8decoder.end(
            Buffer.from(
                base64.toByteArray(sendCommandRaw.command as string).buffer
            )
        );
        const pushLog = connState.uiStreamAgg.inStream.push(
            sendCommandRaw.command
        );

        loger.debug(
            `revc ${sendCommandRaw.command} - ${
                pushLog + " uiStreamAgg.inStream.push(sendCommandRaw.command)"
            }`
        );
    },

    createNewCommandRunning: async (opt: {
        connState: NetworkSession;
        sendCommandRaw: sendCommand;
    }) => {
        const { sendCommandRaw, connState } = opt;
        const utf8decoder = new StringDecoder();
        try {
            let runCommand = "";
            let commandRes: CommandAnalysisRes | undefined;
            {
                sendCommandRaw.command = utf8decoder.end(
                    Buffer.from(
                        base64.toByteArray(sendCommandRaw.command as string)
                    )
                );
                //out to view
                writeToStream(
                    connState.uiStreamAgg.outStream,
                    sendCommandRaw.command
                );
                switch (sendCommandRaw.command) {
                    case "\n":
                        {
                            runCommand = connState.inputCache;
                            connState.inputCache = "";
                            loger.debug(
                                ` inputCache-> ${
                                    connState.inputCache
                                } Code-> ${sendCommandRaw.command.charCodeAt(
                                    0
                                )} `
                            );
                        }
                        break;
                        ///
                    case "\b":
                        if(connState.inputCache.length==0){
                            break;
                        }
                        break;
                    default:
                        {
                            connState.inputCache =
                                connState.inputCache + sendCommandRaw.command;
                            loger.debug(
                                `inputCache-> ${
                                    connState.inputCache
                                } Code-> ${sendCommandRaw.command.charCodeAt(
                                    0
                                )}`
                            );
                        }
                        return;
                }
            }
            {
                const context: CommandContext = connState.context;
                const commandSentence = sentenceAnalysis(runCommand);
                connState.commandState = CommandState.run;
                for (const nextCommand of commandSentence) {
                    await commandAnalysis(
                        nextCommand,
                        context,
                        connState.uiStreamAgg,
                        commandRes
                    );
                    rebuildStream(connState.conn);
                }
                writeToStream(
                    connState.uiStreamAgg.outStream,
                    buildTTYTips(connState.context)
                );
            }
            loger.silly("next command");
        } catch (e) {
            loger.error(e);
        } finally {
            rebuildStream(connState.conn);
            connState.commandState = CommandState.stop;
        }
    },
};

/// ws command run on function
/// ws command run on son function
async function wsCommandRun(dataBox: networkBootstrapPackage, conn: ws) {
    const connState = globalConnectState.get(conn)!;
    if (!connState.authState) {
        //no auth
        return;
    }
    const sendCommandRaw = dataBox.carry as sendCommand;
    switch (connState.commandState) {
        case CommandState.run:
            wsCommandRunSonState.outInCommandRunning({
                connState: connState,
                sendCommandRaw: sendCommandRaw,
            });
            break;
        case CommandState.stop:
            /// create new command
            wsCommandRunSonState.createNewCommandRunning({
                connState: connState,
                sendCommandRaw: sendCommandRaw,
            });
            break;
    }
}

/// WebSocket Bootstrap
export async function networkWsTTYBootstrap(): Promise<void> {
    setBootstrapMode(BootstrapMode.networkWs);
    wsServer.on("connection", (conn) => {
        conn.on("message", async (rawData) => {
            const rawString = rawData.toString();
            const dataBox: networkBootstrapPackage = JSON.parse(rawString);
            loger.silly(`${rawString}`);
            switch (dataBox.code) {
                /// Login
                case loginAuthReqCode:
                    wsLoginRun(dataBox, conn);
                    break;
                /// revc command main
                case sendCommandReqCode:
                    wsCommandRun(dataBox, conn);
                    break;
            }
        });
    });
}
