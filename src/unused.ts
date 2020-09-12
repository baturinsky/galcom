import { Star, tagColors, tagsList } from "./Star";

function sortedTags(tags:number[]){
  return Object.entries(tags).sort((a, b) => b[1] - a[1])
}

function tagsTable(star: Star) {
  return `<div class=tags>${
    sortedTags(star.talks)
    .map(
      ([tag, value]) =>
        `<div>${value.toFixed(1)}</div><div style="color:${
          tagColors[tag]
        }; font-size:${(10 + value * 2) | 0}px">#${tagsList[tag]}</div>`
    )
    .join(``)}</div>`;
}