export function ab2str(buf:ArrayBuffer,encode:BufferEncoding="utf8"):string{
    return Buffer.from(buf).toString(encode)
}