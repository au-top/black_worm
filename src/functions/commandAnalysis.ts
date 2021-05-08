
function getPart(
    source: string,
    start: number,
    partlength: number
): [string, string, string] {
    const sourceList = source.split("");
    const header = sourceList.slice(0, start).join("");
    const center = sourceList.slice(start, start + partlength).join("");
    const end = sourceList.slice(start + partlength).join("");
    return [header, center, end];
}

//解析
export function sentenceAnalysis(sentence: string): string[] {
    const sqMark = /'[^']*'/gim;
    const dqMark = /"[^"]*"/gim;
    const sqMarkBoxContents = sentence.matchAll(sqMark);
    const reMap: Record<string, string> = {};
    const indexKeyList: string[] = [];
    let charOffset = 0;
    let index = 0;
    for (const nextSlice of sqMarkBoxContents) {
        if (nextSlice.index != null) {
            const contentLength = nextSlice[0].length;
            const [h, c, e] = getPart(
                sentence,
                nextSlice.index - charOffset,
                contentLength
            );
            const placeChar = `<*XAS${index++}F*WH>`;
            reMap[placeChar] = c;
            sentence = `${h}${placeChar}${e}`;
            charOffset += c.length - placeChar.length;
            indexKeyList.push(placeChar);
        }
    }
    const dqMarkBoxContents = sentence.matchAll(dqMark);
    charOffset = 0;
    for (const nextSlice of dqMarkBoxContents) {
        if (nextSlice.index != null) {
            const contentLength = nextSlice[0].length;
            const [h, c, e] = getPart(
                sentence,
                nextSlice.index - charOffset,
                contentLength
            );
            const placeChar = `<*XAS${index++}F*H>`;
            reMap[placeChar] = c;
            sentence = `${h}${placeChar}${e}`;
            charOffset += c.length - placeChar.length;
            indexKeyList.push(placeChar);
        }
    }
    const sentenceCommandEncode = sentence.split("&&");
    const indexKeyListReverse = indexKeyList.reverse();
    for (const nextKey of indexKeyListReverse) {
        const value = reMap[nextKey];
        for (
            let nextCommandIndex = 0;
            nextCommandIndex < sentenceCommandEncode.length;
            nextCommandIndex++
        ) {
            const findRes = sentenceCommandEncode[nextCommandIndex].split(
                nextKey
            );
            if (findRes.length > 1) {
                sentenceCommandEncode[nextCommandIndex] = findRes.join(value);
                break;
            }
        }
    }
    return sentenceCommandEncode;
}