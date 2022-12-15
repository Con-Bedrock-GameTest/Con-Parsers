import { GameMode} from "@minecraft/server";
import { StringRef} from "./data.js";
import {legacyParserRegex} from "./consts.js";
import { parseStringValidator} from './main.js';

/** @param {StringRef} ref @returns {GameMode | undefined} */
function parseGamemode(ref){
    let string = parseStringValidator(ref,{deny:"_.?;!#&"}).toLowerCase();
    if(string === '0' || string === 's' || string === 'survival') return GameMode.survival;
    if(string === '1' || string === 'c' || string === 'creative') return GameMode.creative;
    if(string === '2' || string === 'a' || string ==='adventure') return GameMode.adventure;
    if(string === '6' || string === 'sp' || string ==='spectator') return GameMode.spectator;
}

/** @type {(string: string)=>string[]} */
const LegacyArgumentParser = (string)=>string.match(legacyParserRegex);
export {parseGamemode as ParseGameMode, LegacyArgumentParser};