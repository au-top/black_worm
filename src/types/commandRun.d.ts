import { Writable, Readable } from "stream";
export type CommandRunRes =  {passdown:boolean,state:boolean,carry?:Record<string,string>[]};
export interface CommandRun {
    (commandAnalysisList:Array<string>,context:CommandContext,uiStreamAgg:UIStreamAgg,carry?:Record<string,string>[],state?:boolean):CommandRunRes
}

export interface UIStreamAgg {
    outStream:Writable,
    inStream:Readable,
    errStream:Writable,
}
// process.stdout
export interface CommandAnalysisRes{
    readonly state:boolean;
    readonly carry?:Record<string,string>[]
}   