import { Entity, GameMode, Location} from "@minecraft/server";
import { StringRef, ParserSyntaxError, ParserValidator, RangeParserSyntaxError, UnexpectedEndOfInput  } from "./data.js";
import { parseNumberValidator, parseObjectValidate, parseStringValidator, parseTextValidator, SkipCharacters } from './main.js';
import { ParseGameMode } from "./minecraft.js";

const types = {
    "number": "number",
    "string": "string",
    "range": "range",
    "gamemode": "gamemode",
    "relative": "relative",
    "score": "score"
};
function push(o,k,v){
    o[k] = o[k]??[];
    o[k].push(v);
    return o;
}
/** @type {{[key: string]: {type: string}}} */
const targetValidating = {
    "c": {type: types.number, modifier: {allowFloat: false},valid(o,v){return v.value !== 0;}, build(o,v){o[v.value > 0?"closest":"farthest"] = Math.abs(v.value); }},
    "dx": {type: types.number},
    "dy": {type: types.number},
    "dz": {type: types.number},
    "family": {type: types.string, canExclude: true, build(o,v){v.exclude?push(o,"excludeFamilies",v.value):o["family"] = v.value;}},
    "l": {type: types.number, modifier: {allowFloat: false, allowNegative: false},build(o,v){o["minLevel"] = v.value}},
    "lm": {type: types.number, modifier: {allowFloat: false, allowNegative: false},build(o,v){o["maxLevel"] = v.value}},
    "m": {type: types.gamemode, canExclude: true, build(o,v){v.exclude?push(o,"excludeGameModes",v.value):o["gameMode"] = v.value;}},
    "name": {type: types.string, canExclude: true, build(o,v){v.exclude?push(o,"excludeNames",v.value):o["name"] = v.value;}},
    "r": {type: types.number, modifier: {allowNegative:false}, build(o,v){o["maxDistance"]=v.value }},
    "rm": {type: types.number, modifier: {allowNegative:false}, build(o,v){o["minDistance"]=v.value }},
    "rx": {type: types.number, build(o,v){o["maxVertitalRotation"]=v.value }},//maxHorizontalRotation
    "rxm": {type: types.number, build(o,v){o["minVertitalRotation"]=v.value }},
    "ry": {type: types.number, build(o,v){o["minHorizontalRotation"]=v.value }},
    "rym": {type: types.number, build(o,v){o["maxHorizontalRotation"]=v.value }},
    "scores": {type: types.score, build(o,v){o["scoreOptions"] = v.value }},
    "tag": {type: types.string, canExclude: true, build(o,v){push(o,v.exclude?"excludeTags":"tags",v.value);}},
    "type": {type: types.string, canExclude: true, build(o,v){v.exclude?push(o,"excludeTypes",v.value):o["type"] = v.value;}},
    "x": {type: types.relative, modifier: {relativeType:types.number},valid(o){return o["location"]["xSet"]??true;},build(o,v){v.relative?o["location"].x += v.value:o["location"].x = v.value; o["location"]["xSet"] = false; }},
    "y": {type: types.relative, modifier: {relativeType:types.number},valid(o){return o["location"]["ySet"]??true;},build(o,v){v.relative?o["location"].y += v.value:o["location"].y = v.value; o["location"]["ySet"] = false; }},
    "z": {type: types.relative, modifier: {relativeType:types.number},valid(o){return o["location"]["zSet"]??true;},build(o,v){v.relative?o["location"].z += v.value:o["location"].z = v.value; o["location"]["zSet"] = false; }}
};
/** @param {StringRef} ref */
function parseScore(ref){
    const array = [];
    if(ref.at() != "{") throw new ParserSyntaxError(ref);
    ref.index++;
    SkipCharacters(ref);
    if(ref.at() == "}") {ref.index++; return array;}
    for (ref.index; ref.index < ref.length; ref.index++) {
        SkipCharacters(ref);
        const score = {};
        const key = parseStringValidator(ref,{deny:"= ",allowedChars:"._"});
        score.objective = key;
        SkipCharacters(ref);
        if(ref.at() != "=") throw new ParserSyntaxError(ref);
        else ref.index++;
        SkipCharacters(ref);
        score.exclude = exclude(ref);
        const value = parseRange(ref);
        if(value.min) score.minScore = value.min;
        if(value.max) score.maxScore = value.max;
        array.push(score);
        SkipCharacters(ref);
        if(ref.at() == "}") {ref.index++; return array;}
        if(ref.at() != ",") throw new ParserSyntaxError(ref);
    }
    throw new UnexpectedEndOfInput(ref);
}
/** @param {StringRef} ref */
function parseRange(ref){
    const output = {}, {index} = ref;
    let text = parseStringValidator(ref,{allowedChars:"-",deny:". "});
    if(text!==""){
         output.min = Number(text);
         if(!isFinite(output.min)) throw new RangeParserSyntaxError(ref,index);
         output.max = output.min;
         SkipCharacters(ref);
    }
    if(ref.at() + ref.at(ref.index + 1) === '..'){
        ref.index += 2;
        SkipCharacters(ref);
        text = parseStringValidator(ref,{allowedChars:"-",deny:". "});
        if(text!==""){
            output.max = Number(text);
            if(!isFinite(output.max)) throw new RangeParserSyntaxError(ref,index);
            SkipCharacters(ref);
        }else{
            delete output.max;
        }
    }
    return output;
}
function exclude(ref){
    if(ref.at() === '!'){
        ref.index++;
        SkipCharacters(ref);
        return true;
    }
    return false;
}
const parseFunctions = {
 [types.number]: n=>({value:parseNumberValidator(n,{parseFunc: parseFloat})}),
 [types.string]: t=>({value:parseTextValidator(t)}),
 [types.gamemode]: g=>({value:ParseGameMode(g)}),
 [types.relative]: parseRelative,
 [types.range]: r=>({value:parseRange(r)}),
 [types.score]: sc=>({value:parseScore(sc)})
}
function parseRelative(ref,modifier){
    const {relativeType=types.string, relativeChar = '~'} = modifier??{};
    let relative = false;
    if(ref.at() === relativeChar){
        ref.index++;
        relative = true;
    }
    return {value:parseFunctions[relativeType](ref,modifier).value,relative:relative};
}

const validateFunctions = {
    [types.number]: ({value: num},modifier)=>{
        const {allowFloat=true,allowNegative=true} = modifier;
        const output = {valid: true, msg:"invalid number "};
        if(!isFinite(num)) output.valid = false;
        if(num.toString().includes(".")) if(!allowFloat){output.msg = "float value "; output.valid = false};
        if(num < 0 && !allowNegative) {output.msg ="negative value "; output.valid = false};
        return output;
    },
    [types.string]: n=>({valid:true}),
    [types.gamemode]: g=>({valid:Object.getOwnPropertyNames(GameMode).includes(g.value),msg: "gamemode "}),
    [types.score]: ()=>({valid:true}),
    [types.boolean]: b=>({valid:[true,false].includes(b.value),msg: "invalid boolean "}),
    [types.relative]: (r,mod)=>({valid: validateFunctions[mod.relativeType]?.(r,mod)?.valid??false})
}
function ParseValue(ref, key, object){
    const tv = targetValidating[key], {type,modifier={},canExclude=false,valid = ()=>true,build = (o,v,k)=>o[key] = v.value} = tv, {index} = ref;
    let exc = false;
    if(canExclude) exc = exclude(ref);
    const v = parseFunctions[type](ref,modifier);
    v.exclude = exc;
    let a = validateFunctions[type](v,modifier);
    if(valid.call(tv,object,v,key) === false) throw new RangeParserSyntaxError(ref,index,ref.index);
    if(!a.valid) throw new RangeParserSyntaxError(ref,index,ref.index,a.msg??"");
    build.call(tv,object,v,key);
    return v.value;
}
/** @param {StringRef} ref @param {Entity} sender @returns {Generator<Entity,number>} */
function* ReturnByName(ref, sender){
    return yield* YieldCount(sender.dimension.getPlayers({name:parseTextValidator(ref,{initialChar:'"',endingChar:'"',deny:" ["})}))
}
/** @type {<T>(iterator: Iterable<T>)=>Generator<T,number>} */
function* YieldCount(iterator){
    let i = 0;
    for (const v of iterator) {
        yield v;
        i++;
    }
    return i;
}
/** @param {StringRef} ref @param {Entity} sender @returns {Generator<Entity,number>} */
function* ParseTarget(ref, sender){
    if(ref.at() === "@"){
        ref.index++;
        const {index} = ref;
        if(ref.at() === '"') return yield* ReturnByName(ref,sender);
        const text = parseStringValidator(ref,{deny:" ["});
        const {dimension, location: {x,y,z}} = sender;
        if(text.length>1&&text!="here") return yield* YieldCount(dimension.getPlayers({name:text}));
        if(!"aeprs".includes(text) && text!=="here") throw new ParserSyntaxError(ref,-1);
        SkipCharacters(ref);
        /**@type {import("@minecraft/server").EntityQueryOptions} */
        let a = {location:new Location(x,y,z)};
        if(ref.at() === "[") {
            ParseMain(ref,a);
            console.warn("ParseMain: ", JSON.stringify(a));
        }
        switch (text) {
            case "e":
                return yield* YieldCount(dimension.getEntities(a));
            case "a":
            case "here":
                return yield* YieldCount(dimension.getPlayers(a));
            case "r":
                const arr = [...dimension.getPlayers(a)];
                if(arr.length===0) return 0;
                yield arr[Math.floor(Math.random() * arr.length)];
                return 1;
            case "p":
                a.closest = 1;
                delete a.farthest;
                for(const pl of dimension.getPlayers(a)){
                    yield pl;
                    return 1;
                }
                return 0;
            case "s":
                for(const pl of dimension.getEntities(a)){
                    if(pl === sender){
                        yield pl;
                        return 1;
                    }
                }
                return 0;
        }
        throw new RangeParserSyntaxError(ref,index);
    }
    else{
        return yield* ReturnByName(ref,sender);
    }
}
function ParseMain(ref,object){
    parseObjectValidate(
        ref, 
        {initialChar:"[", endingChar:"]", assignChar:"=", 
            parseProperty(raf){ return parseStringValidator(raf, {allowedChars:".:_~", deny:"=,!"}); },
            parseAny(raf,validater, key){ return ParseValue(raf,key,object);}
        },
        new ParserValidator(a=>true,key=>Object.getOwnPropertyNames(targetValidating).includes(key))
        );
    return object;
}
class EntityQueryParser{
    /** @param {string | StringRef} string @param {Entity} self @returns {Generator<Entity,number>}*/
    static* ParseTarget(string, self){
        return yield* ParseTarget(StringRef.toRef(string),self);
    }
    /** @param {string | StringRef} string @param {Location} baseLocation @returns {import("@minecraft/server").EntityQueryOptions} */
    static ParseSelectorArguments(string,baseLocation = new Location(0,0,0)){
        string = StringRef.toRef(string);
        return ParseMain(string,{location:baseLocation});
    }
}

export {EntityQueryParser,parseRange};