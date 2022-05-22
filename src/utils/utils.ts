export type CSSClass = string | { [key: string]: boolean };
export function classnames(...cssClasses: CSSClass[]): string {
  let classes = [];
  for (let cssClass of cssClasses) {
    if (typeof cssClass === "string") {
      classes.push(cssClass);
    } else {
      for (let key of Object.keys(cssClass)) {
        if (cssClass[key]) {
          classes.push(key);
        }
      }
    }
  }
  return classes.join(" ");
}
