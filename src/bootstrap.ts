import readline from "readline";
import ws from "ws";
import base64 from "base64-js";
import { Writable, Readable } from "stream";
import { commandAnalysis } from "./core/commandExec";
import { CommandAnalysisRes, UIStreamAgg } from "./types/commandRun.d";
import { NetworkSession } from "./types/networkTTY/networkSession";
import { baseContextBuilder } from "./baseContext";
import { setBootstrapMode } from "./globalInfo";
import { BootstrapMode, CommandState } from "./types/bootstrap.d";
import { sentenceAnalysis } from "./functions/commandAnalysis";
import { loginAuthReqCode, sendCommandReqCode } from "./core/networtBootstrap";
import { StringDecoder } from "string_decoder";
import {
    buildNetworkResAuthPackage,
    buildNetworkViewPackage,
} from "./functions/network/buildNetworkPackage";
import { loger } from "./log";
import { writeToStream } from "./functions/streamUtil";
import { buildTTYTips } from "./functions/ttyTips";

//本地终端引导
export async function localTTYBootstrap(): Promise<void> {
    const localTTYContext = baseContextBuilder();
    setBootstrapMode(BootstrapMode.local);
    const ttyIO = readline.createInterface(process.stdin, process.stdout);
    const uiStreamAgg: UIStreamAgg = {
        inStream: process.stdin,
        outStream: process.stdout,
        errStream: process.stderr,
    };
    process.stdin.on("data", (e) => {
        loger.silly("in=> ", e);
    });
    (async () => {
        const newLocal = true;
        while (newLocal) {
            await new Promise((res) => {
                ttyIO.question(
                    buildTTYTips(localTTYContext),
                    async (inRead) => {
                        const commands = sentenceAnalysis(inRead);
                        let commandRes: CommandAnalysisRes | undefined;
                        for (const nextCommand of commands) {
                            commandRes = await commandAnalysis(
                                nextCommand,
                                localTTYContext,
                                uiStreamAgg,
                                commandRes
                            );
                            if (!commandRes.state) {
                                break;
                            }
                        }
                        res(true);
                    }
                );
            });
        }
    })();
}

//WebSocket 网络引导
export async function networkWsTTYBootstrap(): Promise<void> {
    setBootstrapMode(BootstrapMode.networkWs);
    const wsServer = new ws.Server({ host: "0.0.0.0", port: 8086 });
    const globalConnectState = new Map<ws, NetworkSession>();
    const serverPasswd = "helloworld";
    const rebuildStream = (conn: ws): UIStreamAgg => {
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
        const getConn = globalConnectState.get(conn);
        if (getConn) {
            getConn.uiStreamAgg = returnStreamAgg;
        }
        return returnStreamAgg;
    };

    wsServer.on("connection", (conn) => {
        let authState = false;
        let commandState: CommandState = CommandState.stop;
        let inputCache = "";
        conn.on("message", async (rawData) => {
            const rawString = rawData.toString();
            const dataBox: networkBootstrapPackage = JSON.parse(rawString);
            loger.silly(`${rawString}`);
            switch (dataBox.code) {
                /// Login
                case loginAuthReqCode:
                    {
                        const authPackage = dataBox.carry as loginAuth;
                        if (authPackage.passwd == serverPasswd) {
                            authState = true;
                            globalConnectState.set(conn, {
                                uiStreamAgg: rebuildStream(conn),
                                context: baseContextBuilder(),
                            });
                            conn.send(
                                JSON.stringify(buildNetworkResAuthPackage(true))
                            );
                        } else {
                            conn.send(
                                JSON.stringify(
                                    buildNetworkResAuthPackage(false)
                                )
                            );
                        }
                    }
                    break;
                /// revc command main
                case sendCommandReqCode:
                    {
                        if (!authState) {
                            //no auth
                            return;
                        }
                        const sendCommandRaw = dataBox.carry as sendCommand;
                        const utf8decoder = new StringDecoder();
                        let commandRes: CommandAnalysisRes | undefined;
                        switch (commandState) {
                            case CommandState.run:
                                {
                                    sendCommandRaw.command = utf8decoder.end(
                                        Buffer.from(
                                            base64.toByteArray(
                                                sendCommandRaw.command as string
                                            ).buffer
                                        )
                                    );
                                    const uiStreamAgg =
                                        globalConnectState.get(
                                            conn
                                        )!.uiStreamAgg;
                                    const pushLog = uiStreamAgg.inStream.push(
                                        sendCommandRaw.command
                                    );

                                    loger.debug(
                                        `revc ${sendCommandRaw.command} - ${
                                            pushLog +
                                            " uiStreamAgg.inStream.push(sendCommandRaw.command)"
                                        }`
                                    );
                                }
                                break;
                            case CommandState.stop:
                                {
                                    try {
                                        let runCommand = "";
                                        {
                                            sendCommandRaw.command =
                                                utf8decoder.end(
                                                    Buffer.from(
                                                        base64.toByteArray(
                                                            sendCommandRaw.command as string
                                                        )
                                                    )
                                                );
                                            //out to view
                                            writeToStream(
                                                globalConnectState.get(conn)!
                                                    .uiStreamAgg.outStream,
                                                sendCommandRaw.command
                                            );
                                            switch (sendCommandRaw.command) {
                                                case "\n":
                                                    {
                                                        runCommand = inputCache;
                                                        inputCache = "";
                                                        loger.debug(
                                                            ` inputCache-> ${inputCache} Code-> ${sendCommandRaw.command.charCodeAt(
                                                                0
                                                            )} `
                                                        );
                                                    }
                                                    break;
                                                default:
                                                    {
                                                        inputCache =
                                                            inputCache +
                                                            sendCommandRaw.command;
                                                        loger.debug(
                                                            `inputCache-> ${inputCache} Code-> ${sendCommandRaw.command.charCodeAt(
                                                                0
                                                            )}`
                                                        );
                                                    }
                                                    return;
                                            }
                                        }
                                        {
                                            const context: CommandContext =
                                                globalConnectState.get(
                                                    conn
                                                )!.context;
                                            const commandSentence =
                                                sentenceAnalysis(runCommand);
                                            commandState = CommandState.run;
                                            for (const nextCommand of commandSentence) {
                                                const uiStreamAgg =
                                                    globalConnectState.get(
                                                        conn
                                                    )!.uiStreamAgg;
                                                await commandAnalysis(
                                                    nextCommand,
                                                    context,
                                                    uiStreamAgg,
                                                    commandRes
                                                );
                                                rebuildStream(conn);
                                            }
                                            writeToStream(
                                                globalConnectState.get(conn)!
                                                    .uiStreamAgg.outStream,
                                                buildTTYTips(
                                                    globalConnectState.get(
                                                        conn
                                                    )!.context
                                                )
                                            );
                                        }
                                        loger.silly("next command");
                                    } catch (e) {
                                        loger.error(e);
                                    } finally {
                                        rebuildStream(conn);
                                        commandState = CommandState.stop;
                                    }
                                }
                                break;
                        }
                    }
                    break;
            }
        });
    });
}
