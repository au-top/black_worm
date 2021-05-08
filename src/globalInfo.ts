import { BootstrapMode } from "./types/bootstrap.d";
import path from "path";
import { loger } from "./log";
export const programInDirPath = path.resolve(__dirname);
export let bootstrapMode:BootstrapMode;
export function setBootstrapMode(setMode:BootstrapMode):void{
    if(bootstrapMode==BootstrapMode.none||bootstrapMode==null||bootstrapMode==undefined){
        bootstrapMode=setMode;
    }else{
        loger.error("set boot mode multiple times");
        loger.warning("set boot mode fail");
    }
}