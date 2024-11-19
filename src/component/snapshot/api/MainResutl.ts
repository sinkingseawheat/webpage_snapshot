import { type BrowserContext, } from "playwright";
import { defaultFormFieldValues } from "../FormData";
import { MainResultRecord } from "../JSON";

type FormData = typeof defaultFormFieldValues;

class MainResult{
  private record:Partial<MainResultRecord> = {}
  constructor(){}
  updateRecord(args:Pick<MainResultRecord, keyof MainResultRecord>){
    this.record = {...this.record, ...args};
  }
}

export { MainResult }