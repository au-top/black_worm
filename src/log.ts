import winston from "winston"

const debug_loger= winston.createLogger({
    level:"debug",
    format: winston.format.simple(),
    transports:[
        new winston.transports.Console,
        new winston.transports.File({filename:"console.log",level:"silly"}),
    ],
});

export const loger=debug_loger;