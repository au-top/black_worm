
//loadCommandPlugin
import "./loadCommandPlugin";
//load bootstrap function
import { localTTYBootstrap, networkWsTTYBootstrap } from "./bootstrap";
import { BootstrapMode } from "./types/bootstrap.d";
import { bootstrapMode , setBootstrapMode} from "./globalInfo";
setBootstrapMode(BootstrapMode.none)
// networkWsTTYBootstrap();
// use local
localTTYBootstrap();