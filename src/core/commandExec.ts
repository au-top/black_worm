import { exec, execSync } from "child_process";
import { globalProgramCommand } from "../loadCommandPlugin";
import { CommandAnalysisRes, UIStreamAgg } from "../types/commandRun";
import { bootstrapMode } from "../globalInfo";
import { BootstrapMode } from "../types/bootstrap.d";
import { writeToStream } from "../functions/streamUtil";
import { loger } from "../log";

//exec
export async function commandAnalysis(
    rawCommand: string,
    context: CommandContext,
    uiStreamAgg: UIStreamAgg,
    commandAnalysisRes?: CommandAnalysisRes
): Promise<CommandAnalysisRes> {
    const trimRawCommand = rawCommand.trim();
    if (trimRawCommand.length == 0) {
        return {
            state: false,
        };
    }
    let nowState: boolean | undefined = commandAnalysisRes?.state;
    let nowCarry: Record<string, string>[] | undefined =
        commandAnalysisRes?.carry;
    for (const nextGlobalProgramCommand of globalProgramCommand) {
        if (nextGlobalProgramCommand[0].test(trimRawCommand)) {
            const { passdown, state, carry } = nextGlobalProgramCommand[1](
                Array.from(
                    trimRawCommand.match(nextGlobalProgramCommand[0]) ?? []
                ),
                context,
                uiStreamAgg,
                nowCarry,
                nowState
            );
            nowCarry = carry;
            nowState = state;
            if (!passdown) {
                // no passdown so return exit function
                return {
                    state: nowState,
                    carry: nowCarry,
                };
            }
        }
    }
    try {
        switch (bootstrapMode) {
            case BootstrapMode.local:
                {
                    execSync(trimRawCommand, {
                        cwd: context.currentPath,
                        stdio: [
                            uiStreamAgg.inStream,
                            uiStreamAgg.outStream,
                            uiStreamAgg.errStream,
                        ],
                    });
                }
                break;
            case BootstrapMode.networkWs:
                {
                    await new Promise((res, rej) => {
                        //clear stream data
                        uiStreamAgg.inStream.read();
                        const execChild = exec(
                            trimRawCommand,
                            { cwd: context.currentPath },
                            (err, out, errInfo) => {
                                if (err != null) {
                                    writeToStream(uiStreamAgg.errStream, errInfo.toString()??"");
                                    rej(err);
                                }
                                res(out);
                                    //exit
                                if (execChild.stdin!=undefined&&execChild.stdin != null)uiStreamAgg.inStream.unpipe(execChild.stdin);
                                execChild.stderr?.unpipe(uiStreamAgg.errStream);
                                execChild.stdout?.unpipe(uiStreamAgg.outStream);
                            }
                        );
                        //setup
                        if (execChild.stdin!=undefined&&execChild.stdin != null)
                            uiStreamAgg.inStream.pipe(execChild.stdin);
                        execChild.stderr?.pipe(uiStreamAgg.errStream);
                        execChild.stdout?.pipe(uiStreamAgg.outStream);
                    });
                }
                break;
        }
        nowState = true;
        nowCarry = undefined;
    } catch (e) {
        if(e.output){
            loger.error(
                e?.output
                    ?.filter((v: Buffer | null) => v != null)
                    .map((v: Buffer) => v.toString("utf8"))
                    .join("") ?? e
            );
        }else{
            loger.error(e);
        }
        nowState = false;
        nowCarry = undefined;
        // run raw command error
        return {
            state: nowState,
            carry: nowCarry,
        };
    }
    return {
        state: nowState,
        carry: nowCarry,
    };
}
