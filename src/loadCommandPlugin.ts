import path from "path";
import fs from "fs";
import { programInDirPath } from "./globalInfo";
import { CommandRun } from "./types/commandRun";
import { loger } from "./log";

const globalProgramCommand: [RegExp, CommandRun][] = [];
const commandDirPath = path.join(programInDirPath, "command");
(() => {
    // install command plugin
    const loadCommand: string[] = fs
        .readdirSync(commandDirPath)
        .map((e) => path.join(commandDirPath, e))
        .map((e) => (fs.statSync(e).isFile() ? e : null))
        .map(
            (e) =>
                e &&
                (path.parse(e).ext == ".js" || path.parse(e).ext == ".ts"
                    ? e
                    : null)
        )
        .filter((e) => e !== null) as string[];
    for (const nextLoadCommandPath of loadCommand) {
        try {
            const {
                commandMatch: loadCommandMatch,
                commandRun: loadCommandRun,
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            } = require(nextLoadCommandPath);
            if (
                loadCommandMatch instanceof RegExp &&
                loadCommandRun instanceof Function
            ) {
                globalProgramCommand.push([
                    loadCommandMatch as RegExp,
                    loadCommandRun,
                ]);
            } else {
                throw "load command export type error";
            }
        } catch (e) {
            loger.error("load Command ", "nextLoadCommandPath", e);
        }
    }
    //print load command plugin
    loger.info(`load Command ${loadCommand.join(',')}`);
})();
export { globalProgramCommand, commandDirPath };
