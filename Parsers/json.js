import { ParserValidator, RangeParserSyntaxError, StringRef } from "./data.js";
import { parseRawStringValidator, parseNumberValidator, parseBooleanValidate, parseArrayValidate, parseObjectValidate } from './main.js';


/** @param {StringRef} ref @param {ParserValidator} validator @returns {string} */
function parseJsonString(ref, validator = new ParserValidator()){
    return parseRawStringValidator(ref,null, validator);
}
/** @param {StringRef} ref @param {ParserValidator} validator  @returns {number}*/
function parseJsonNumber(ref, validator = new ParserValidator()){
    const {index} = ref;
    const a = parseNumberValidator(ref,{parseFunc: Number},validator);
    if(isNaN(a)) throw new RangeParserSyntaxError(ref,index,ref.index);
    else return a;
}
/** @param {StringRef} ref  @param {ParserValidator} validator @returns {boolean} */
function parseJsonBoolean(ref, validator = new ParserValidator()){
    return parseBooleanValidate(ref,{allowUpperCase:true}, validator);
}

/** @param {StringRef} ref @param {ParserValidator} validator  @returns {any[]}*/
function parseJsonArray(ref, validator = new ParserValidator()){
    return parseArrayValidate(ref,{initialChar:"[", endingChar:"]", splitChar: ',', parseAny: parseJsonAny},validator)
}
/** @param {StringRef} ref @param {ParserValidator} validator  @returns {Object}*/
function parseJsonObject(ref, validator = new ParserValidator()){
    return parseObjectValidate(ref,{initialChar:"{", endingChar:"}", splitChar: ',', assignChar:':', parseAny: parseJsonAny, parseProperty: parseJsonString},validator);
}
/** @param {StringRef} ref  @param {ParserValidator} validator @returns {any}*/
function parseJsonAny(ref, validator = new ParserValidator()){
    const current = ref.at();
    if(current == '"') return parseJsonString(ref,validator);
    if(current == '{') return parseJsonObject(ref,validator);
    if(current == '[') return parseJsonArray(ref,validator);
    if("tf".includes(current.toLowerCase())) return parseJsonBoolean(ref,validator);
    else return parseJsonNumber(ref,validator);
}

function JsonParser(string){
    return parseJsonAny(new StringRef(string), new ParserValidator());
}
function JsonParseValidator(string, validator = new ParserValidator()){
    return parseJsonAny(new StringRef(string), validator);
}
export {JsonParser, JsonParseValidator};