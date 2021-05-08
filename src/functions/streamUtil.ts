import { Writable } from "stream";
import { loger } from "../log";

export function writeToStream(writeStream:Writable,printContent:string):void{
    if(writeStream.writable){
        writeStream.write(printContent)
    }else{
        loger.error("stream No write");
        loger.error(`WriteContent is ${printContent}`);
    }
}