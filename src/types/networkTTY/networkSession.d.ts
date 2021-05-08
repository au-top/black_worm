import { ReadStream } from "node:fs";
import { Writable } from "node:stream";
import { UIStreamAgg } from "../commandRun";
interface NetworkSession {
    context: CommandContext;
    uiStreamAgg: UIStreamAgg;
}
