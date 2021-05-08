import { loginAuthResCode, showViewResCode } from "../../core/networtBootstrap";

export function buildNetworkBasePackage(
    code: number,
    carry: networkBootstrapReturnDataPackageBase
): networkBootstrapPackage {
    return {
        code: code,
        carry: carry,
    };
}

export function buildNetworkViewPackage(
    content: string
): networkBootstrapPackage {
    return buildNetworkBasePackage(showViewResCode, {
        view: content,
    } as resView);
}

export function buildNetworkResAuthPackage(
    authState: boolean
): networkBootstrapPackage {
    return buildNetworkBasePackage(loginAuthResCode, {
        authState: authState,
    } as resAuth);
}
