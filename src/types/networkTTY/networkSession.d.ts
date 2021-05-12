import ws from "ws";
import { CommandState } from "../bootstrap";
import { UIStreamAgg } from "../commandRun";
interface NetworkSession {
    context: CommandContext;
    uiStreamAgg: UIStreamAgg;
    authState:boolean;
    commandState:CommandState;
    inputCache:string;
    conn:ws;
}
