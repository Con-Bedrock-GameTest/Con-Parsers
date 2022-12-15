export class StringRef extends String{
    /** @type {number} */
    #i = 0;
    get index(){
        return this.#i;
    }
    set index(num){
        this.#i = num;
    }
    constructor(string, index){
        super(string);
        this.#i = index??0;
    }
    /** @param {number} index @returns {string>}*/
    at(index = this.index){
        return this[index];
    }
    setIndex(index = this.index){
        this.#i = index??0;
        return this.index;
    }
    static toRef(string){
        if(string instanceof StringRef) return string
        return new StringRef(string); 
    }
}
export class Unexpected extends SyntaxError{
    constructor(message){
        super(`Unexpected ` + message);
    }
}
export class ParserSyntaxError extends Unexpected{
    /**
     * @param {StringRef} ref 
     * @param {Number} add
     */
     constructor(ref,add = 0, msg = ""){
        let {index} = ref;
        index += add;
        super(msg + `"${ref[index]??""}": at "${ref.substring(index - 10,index)}>>${ref[index]??""}<<${ref.substring(index+1,index+11)}"`);
    }
}
export class RangeParserSyntaxError extends Unexpected{
    /**
     * @param {StringRef} ref 
     * @param {Number} from
     * @param {Number} to
     */
    constructor(ref,from,to = ref.index??undefined,msg = ""){
        super(msg + `"${ref.substring(from,to)}": at "${ref.substring(from - 10,from)}>>${ref.substring(from,to)}<<${ref.substring(to,to + 10)}"`);
    }
}
export class UnexpectedEndOfInput extends Unexpected{
    /**
     * @param {StringRef} ref 
     * @param {Number} add
     */
     constructor(ref){
        super(`end of Input: at "${ref.substring(index - 10,index)}>><<"`);
    }
}
export class UnexpectedTypePassed extends RangeParserSyntaxError{
    /**
     * @param {StringRef} ref 
     * @param {Number} from
     * @param {Number} to
     */
    constructor(ref,type,from = 0,to = ref.index){
        super(ref,from,to, `type [${(type.typeOf?.())??(typeof(type))}]  `);
    }
}
export class ParserValidator{
    constructor(init = ParserValidator.prototype.initType,keyValidate = ParserValidator.prototype.keyValidate, inherite = ParserValidator.prototype.inherite){
        this.initType = init;
        this.keyValidate = keyValidate;
        this.inherite = inherite;
    }
    initType(param){return true;};
    keyValidate(key){return true;};
    inherite(key){return new ParserValidator();};
}