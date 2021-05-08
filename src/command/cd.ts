import fs from "fs";
import path from "path";
import { writeToStream } from "../functions/streamUtil";
import { CommandRun, CommandRunRes, UIStreamAgg } from "../types/commandRun";

const commandMatch = /^cd[\s]?([\S\s]*)$/;
const commandRun: CommandRun = (
    commandAList: Array<string>,
    context: CommandContext,
    uiStreamAgg:UIStreamAgg,
    nowCarry,
    nowState
): CommandRunRes => {
    try {
        const nextPath = commandAList[1];
        const newPath = path.resolve(context.currentPath, nextPath);
        //test path is existence
        fs.statSync(newPath);
        context.currentPath = newPath;
    } catch (e) {
        if ("errno" in e) {
            if (e.errno == -4058) {
                writeToStream(uiStreamAgg.outStream,"path is no existence\n");
            }
        }
        return {
            passdown: false,
            state: false,
        };
    }
    return {
        passdown: false,
        state: true,
    };
};
export { commandMatch, commandRun };
