/**
 *
 * 基础结构
 *
 *
 */
interface networkBootstrapPackage {
    code: number;
    carry: networkBootstrapDataPackageBase;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface networkBootstrapDataPackageBase {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface networkBootstrapReturnDataPackageBase {}

/**
 *
 *
 * 客户端包
 *
 */


/**
{
"code":100,
    "carry":{
        "passwd":"helloworld"
    }
}
 */


interface loginAuth extends networkBootstrapDataPackageBase {
    passwd: string;
}

/**
{
    "code":200,
    "carry":{
        "command":"ls"
    }
}
 */
interface sendCommand extends networkBootstrapDataPackageBase {
    command: string|Uint8Array;
}




/**
 *
 *
 * 服务器返回包
 *
 */

interface resAuth extends networkBootstrapReturnDataPackageBase {
    authState: boolean;
}

interface resView extends networkBootstrapReturnDataPackageBase {
    view: string;
}
