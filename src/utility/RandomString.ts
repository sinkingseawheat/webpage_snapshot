class RandomStringError extends Error {
  static {
    this.prototype.name = 'RandomStringError';
  }
}

class RandomString {
  private source:string = 'abcdefghijklmnopqrstuvwxyz0123456789';
  private generated =new Set<string>();
  private format!:string;
  constructor(private requiredLength:number,option?:{
    format:string,
  }){
    if(option !== undefined && typeof option.format === 'string'){
      this.format = option.format;
    }else{
      this.format = 'YMD';
    }
    if(/[\-\/\\]/.test(this.format)){
      throw new Error(`this.format:${this.format}に「-」、「/」または「\\」を含んではいけません`)
    }
  }
  private get today():{Y:string,M:string,D:string} {
    const d = new Date();
    return {
      Y:d.getFullYear().toString(),
      M:(d.getMonth()+1).toString().padStart(2,'0'),
      D:d.getDate().toString().padStart(2,'0'),
    };
  }
  private getRandomString():string{
    const sLength = this.source.length;
    let splitString = '';
    for(let i = 0;i < this.requiredLength; i++){
      splitString += this.source[Math.floor(Math.random()*sLength)];
    }
    return splitString;
  }
  public getUniqueRandomString ():string{
    let splitString = this.getRandomString();
    while(this.generated.has(splitString) === true){
      splitString = this.getUniqueRandomString();
    }
    const {Y,M,D} = this.today;
    // 複数回は出現しない想定なので、replaceの1番目の引数は文字列
    const returnValue = this.format.replace('Y', Y).replace('M', M).replace('D', D) + '-' + splitString;
    this.generated.add(returnValue);
    return returnValue;
  };
  public clearHistory(){
    this.generated.clear();
  }
}

export { RandomString };