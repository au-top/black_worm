import readline from "readline";
import ws from "ws";
import { Writable, Readable } from "stream";
import { commandAnalysis } from "./core/commandExec";
import { CommandAnalysisRes, UIStreamAgg } from "./types/commandRun.d";
import { NetworkSession } from "./types/networkTTY/networkSession";
import { _baseContext } from "./baseContext";
import { setBootstrapMode } from "./globalInfo";
import { BootstrapMode } from "./types/bootstrap.d";
import { sentenceAnalysis } from "./functions/commandAnalysis";
import { loginAuthReqCode, sendCommandReqCode } from "./core/networtBootstrap";
import {
    buildNetworkResAuthPackage,
    buildNetworkViewPackage,
} from "./functions/network/buildNetworkPackage";
import { loger } from "./log";

//本地终端引导
export async function localTTYBootstrap(): Promise<void> {
    setBootstrapMode(BootstrapMode.local);
    const ttyIO = readline.createInterface(process.stdin, process.stdout);
    const uiStreamAgg: UIStreamAgg = {
        inStream: process.stdin,
        outStream: process.stdout,
        errStream: process.stderr,
    };
    process.stdin.on("data",(e)=>{
        loger.silly("in=> ",e);
    });
    (async () => {
        const newLocal = true;
        while (newLocal) {
            await new Promise((res) => {
                ttyIO.question(
                    `BlackWorm # ${_baseContext.currentPath} >`,
                    async (inRead) => {
                        const commands = sentenceAnalysis(inRead);
                        let commandRes: CommandAnalysisRes | undefined;
                        for (const nextCommand of commands) {
                            commandRes = await commandAnalysis(
                                nextCommand,
                                _baseContext,
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
        enum CommandState {
            stop,
            run,
        }

        let commandState: CommandState = CommandState.stop;

        conn.on("message", async (rawData) => {
            const rawString = rawData.toString();
            const dataBox: networkBootstrapPackage = JSON.parse(rawString);
            loger.silly(`${rawString}`);
            switch (dataBox.code) {
                case loginAuthReqCode:
                    {
                        const authPackage = dataBox.carry as loginAuth;
                        if (authPackage.passwd == serverPasswd) {
                            authState = true;
                            globalConnectState.set(conn, {
                                uiStreamAgg: rebuildStream(conn),
                                context: Object.assign({}, _baseContext),
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
                case sendCommandReqCode:
                    {
                        if (!authState) {
                            //no auth
                            return;
                        }
                        const sendCommandRaw = dataBox.carry as sendCommand;

                        let commandRes: CommandAnalysisRes | undefined;
                        switch (commandState) {
                            case CommandState.run:
                                {
                                    const uiStreamAgg = globalConnectState.get(
                                        conn
                                    )!.uiStreamAgg;
                                    loger.debug(
                                        `${
                                            (uiStreamAgg.inStream.push(
                                                sendCommandRaw.command
                                            )+
                                            " uiStreamAgg.inStream.push(sendCommandRaw.command)")
                                        }`
                                    );
                                }
                                break;
                            case CommandState.stop:
                                {
                                    try {
                                        const context: CommandContext = globalConnectState.get(
                                            conn
                                        )!.context;
                                        const commandSentence = sentenceAnalysis(
                                            sendCommandRaw.command
                                        );
                                        commandState = CommandState.run;
                                        for (const nextCommand of commandSentence) {
                                            const uiStreamAgg = globalConnectState.get(
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
                                        loger.silly("next command");
                                    } catch (e) {
                                        loger.error(e)
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
