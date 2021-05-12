import readline from "readline";
import { commandAnalysis } from "../core/commandExec";
import { CommandAnalysisRes, UIStreamAgg } from "../types/commandRun.d";
import { baseContextBuilder } from "../baseContext";
import { setBootstrapMode } from "../globalInfo";
import { BootstrapMode } from "../types/bootstrap.d";
import { sentenceAnalysis } from "../functions/commandAnalysis";
import { loger } from "../log";
import { buildTTYTips } from "../functions/ttyTips";

/// local TTY Bootstrap 
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