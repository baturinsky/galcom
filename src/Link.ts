import { v2Dist, v2, listNorm } from "./util";
import { Star, tagsList, tagsNumber } from "./Star";

export class Link {
  width = 1;
  flow = 0;
  length:number;
  talks = Array.from({length: tagsNumber}, () => 0.01) as number[];
  talkers = Array.from({length: 100}, () => 0) as number[];

  constructor(public ends: [Star, Star]){
    this.length = v2Dist(this.ends[0].at, this.ends[1].at);
  }

  distToPoint(c: v2) {
    let [a, b] = [this.ends[0].at, this.ends[1].at];
    return v2Dist(a, c) + v2Dist(b, c) - v2Dist(a, b);
  }

  serialise(){
    let save = Object.assign({}, this) as any;
    save.ends = this.ends.map(s=>s.id);
    return save;
  }

  update(dt:number){
    this.flow /= 1 + dt;
    this.talks = listNorm(this.talks);
    this.talkers = listNorm(this.talkers);
  }
  
  get id(){
    return this.ends[0].id*1000 + this.ends[1].id;
  }

  center():v2{
    return [(this.ends[0].at[0] + this.ends[1].at[0])/2, (this.ends[0].at[1] + this.ends[0].at[1])/2]
  }

}
