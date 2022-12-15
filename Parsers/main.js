import { StringRef, ParserSyntaxError, RangeParserSyntaxError, UnexpectedEndOfInput, ParserValidator, UnexpectedTypePassed } from './data.js';
import { BreakingChars, BackSlachChars } from './consts.js';

/**
 * @typedef {{deny?: string, onlyDeny?: boolean, allowedChars?: string}} StringOprions
 * @typedef {{initialChar?: '"' | string, endingChar?: '"' | string}} RawStringOprions
 * @typedef {{allowUpperCase?: boolean}} BooleanOptions
 * @typedef {{parseFunc?: (arg: string)=>number}} NumberOptions
 * @typedef {{initialChar?: string, endingChar?: string, splitChar?: string, assignChar?: string, parseAny?: (arg: StringRef)=>any, parseProperty?: (arg: StringRef)=>string}} ObjectOptions
 * @typedef {{initialChar?: string, endingChar?: string, splitChar?: string, parseAny?: (arg: StringRef)=>any}} ArrayOptions
 * @typedef {StringOprions & RawStringOprions} TextOptions
 * 
 */

/** @param {StringRef} ref @param {string} char*/
export function SkipCharacters(ref,char = ' '){for (ref.index; ref.index < ref.length; ref.index++) if(ref[ref.index]!=char) return;}
/** @param {StringRef} ref @param {NumberOptions} options @returns {number}*/
export function parseNumber(ref, options = {parseFunc: Number}){return parseNumberValidator(ref,options,new ParserValidator());}
/** @param {StringRef} ref @param {RawStringOprions} options @returns {string}*/
export function parseRawString(ref, options = {initialChar: '"', endingChar: '"'}){ return parseRawStringValidator(ref, options, new ParserValidator());}
/** @param {StringRef} ref @param {StringOprions} options @returns {string}*/
export function parseString(ref, options = {breakingChars: BreakingChars, allowedChars: ""}){ return parseStringValidator(ref, options, new ParserValidator());}
/** @param {StringRef} ref @param {BooleanOptions} options @returns {boolean}*/
export function parseBoolean(ref,options = {allowUpperCase: true}){ return parseBooleanValidate(ref,options,new ParserValidator()); }
/** @param {StringRef} ref @param {BackSlachChars | string} backSplashChars @returns {string}*/
export function parseUnicodeSymbol(ref, backSplashChars = BackSlachChars){
    let output = "";
    if(ref.at() !== '\\') throw new ParserSyntaxError(ref);
    ref.index++;
    if(ref.at() === 'u') {
        output = String.fromCharCode(Number(ref.substring(ref.index + 1, ref.index + 5)));
        ref.index += 5;
    } else {
        output = backSplashChars[ref.at()]??ref.at();
        ref.index++;
    }
    if(output==undefined) throw new ParserSyntaxError(ref,-1);
    return output;
}
/** @param {StringRef} ref @returns {string}*/
export function readToEnd(ref){
    const a = ref.substring(ref.index,ref.length);
    ref.index = ref.length;
    return a;
}

/** @param {StringRef} ref @param {ArrayOptions} options @returns {any[]}*/
export function parseArray(ref,options = {initialChar:"[", endingChar:"]", splitChar: ',', parseAny: parseString}){return parseArrayValidate(ref,options,new ParserValidator());}
/** @param {StringRef} ref @param {ObjectOptions} options @returns {any[]}*/
export function parseObject(ref,options = {initialChar:"{", endingChar:"}", splitChar: ',', assignChar: ':', parseAny: parseString, parseProperty: parseString}){return parseObjectValidate(ref,options,new ParserValidator());}
/** @param {StringRef} ref @param {TextOptions} options @param {ParserValidator} validator @returns {string}*/
export function parseText(ref,options = {}){return parseTextValidator(ref,options,new ParserValidator());}


/** @param {StringRef} ref @param {TextOptions} options @param {ParserValidator} validator @returns {string}*/
export function parseTextValidator(ref,options = {},validator = new ParserValidator()){
    const {index} = ref;
    if(!validator.initType("")) { parseTextValidator(ref,options, new ParserValidator()); throw new UnexpectedTypePassed(ref,"",index); }
    if(ref.at() == (options.initialChar??'"')) return parseRawStringValidator(ref,options,validator);
    else return parseStringValidator(ref,options,validator);
}


/** @param {StringRef} ref @param {NumberOptions} options @param {ParserValidator} validator @returns {number}*/
export function parseNumberValidator(ref, options = {parseFunc: Number},validator = new ParserValidator()){
    const {index} = ref; 
    if(!validator.initType(0)) { parseNumberValidator(ref,options, new ParserValidator()); throw new UnexpectedTypePassed(ref,0,index); }
    const {parseFunc=Number}=options, text = parseString(ref,{allowedChars:".-"});
    return parseFunc(text);
}
/** @param {StringRef} ref @param {RawStringOprions} options @param {ParserValidator} validator @returns {string}*/
export function parseRawStringValidator(ref, options = {initialChar: '"', endingChar: '"'},validator = new ParserValidator()){
    let output = "", {initialChar = '"', endingChar=initialChar??'"'} = (options??{}), {index} = ref;
    if(!validator.initType(output)) { parseRawStringValidator(ref,options, new ParserValidator()); throw new UnexpectedTypePassed(ref,output,index); }
    if(ref.at()!=initialChar) throw new ParserSyntaxError(ref);
    for (ref.index++; ref.index < ref.length; ref.index++) {
        const current = ref.at();
        if(current === '\\') {output += parseUnicodeSymbol(ref); ref.index--;}
        else if(current === endingChar) { ref.index++; return output;}
        else output += current;
    }
    throw new UnexpectedEndOfInput(ref);
}
/** @param {StringRef} ref @param {StringOprions} options @param {ParserValidator} validator @returns {string}*/
export function parseStringValidator(ref, options = {onlyDeny: false, allowedChars: ""},validator = new ParserValidator()){
    const {deny = "", onlyDeny = false, allowedChars = ""} = options, {index} = ref;
    if(!validator.initType("")) { parseStringValidator(ref,options, new ParserValidator()); throw new UnexpectedTypePassed(ref,"",index); }
    for(ref.index; ref.index < ref.length; ref.index++){
        const current = ref.at();
        if (((BreakingChars.includes(current) && !onlyDeny) || deny.includes(current)) && !allowedChars.includes(current)) return ref.substring(index,ref.index);
    }
    return ref.substring(index,ref.index);;
}
/**


/** 
 * @param {StringRef} ref
 * @param {BooleanOptions} options 
 * @param {ParserValidator} validator
 * @returns {boolean}*/
export function parseBooleanValidate(ref,options = {allowUpperCase: true}, validator){
    const {index} = ref, {allowUpperCase=true} = options;
    if(!validator.initType(true)) { parseBooleanValidate(ref,options, new ParserValidator()); throw new UnexpectedTypePassed(ref,true,index); }
    let text = parseString(ref,{allowedChars: 'truefals',breakingChars: BreakingChars.concat(" ,.'\"")});
    if(allowUpperCase) text = text.toLowerCase();
    if(text === 'true' || text === 'false') return text==="true";
    else throw new RangeParserSyntaxError(ref,index, ref.index);
}


/** 
 * @param {StringRef} ref 
 * @param {ObjectOptions} options 
 * @param {ParserValidator} validator
 * @returns {any[]}*/
export function parseObjectValidate(ref,options = {initialChar:"{", endingChar:"}", splitChar: ',', assignChar: ':', parseAny: parseString, parseProperty: parseString}, validator = new ParserValidator()){
    const {initialChar = '{', endingChar = '}', splitChar = ',', assignChar = ':', parseAny = parseString, parseProperty = parseString} = (options??{}), object = {}, {index} = ref;
    if(!validator.initType(object)) { parseObjectValidate(ref,options, new ParserValidator()); throw new UnexpectedTypePassed(ref,object,index); }
    if(ref.at() != initialChar) throw new ParserSyntaxError(ref);
    ref.index++;
    SkipCharacters(ref);
    if(ref.at() == endingChar) {ref.index++; return object;}
    for (ref.index; ref.index < ref.length; ref.index++) {
        SkipCharacters(ref);
        let i = ref.index;
        const key = parseProperty(ref);
        if(!validator.keyValidate(key)) throw new RangeParserSyntaxError(ref,i,ref.index,"key ");
        SkipCharacters(ref);
        if(ref.at() != assignChar) throw new ParserSyntaxError(ref);
        else ref.index++;
        SkipCharacters(ref);
        const value = parseAny(ref,validator.inherite(key),key);
        object[key] = value;
        SkipCharacters(ref);
        if(ref.at() == endingChar) {ref.index++; return object;}
        if(ref.at() != splitChar) throw new ParserSyntaxError(ref);
    }
    throw new UnexpectedEndOfInput(ref);
}

/** 
 * @param {StringRef} ref 
 * @param {ArrayOptions} options 
 * @param {ParserValidator} validator
 * @returns {any[]}*/
export function parseArrayValidate(ref,options = {initialChar:"[", endingChar:"]", splitChar: ',', parseAny: parseString}, validator = new ParserValidator()){
    const {initialChar = '[', endingChar = ']', splitChar = ',', parseAny = parseString} = options, array = [], {index} = ref;
    if(!validator.initType(array)) { parseArrayValidate(ref,options, new ParserValidator()); throw new UnexpectedTypePassed(ref,array,index); }
    if(ref.at() != initialChar) throw new ParserSyntaxError(ref);
    ref.index++;
    SkipCharacters(ref);
    if(ref.at() == endingChar) {ref.index++; return array;}
    for (let i = 0; ref.index < ref.length; ref.index++, i++) {
        SkipCharacters(ref);
        array.push(parseAny(ref,validator.inherite(i),i));
        SkipCharacters(ref);
        if(ref.at() == endingChar) {ref.index++; return array;}
        if(ref.at() != splitChar) throw new ParserSyntaxError(ref);
    }
    throw new UnexpectedEndOfInput(ref);
}