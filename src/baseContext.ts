import path from "path";

export const baseContextBuilder=():CommandContext=>({
    currentPath: path.resolve(__dirname),
});