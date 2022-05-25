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


export function hexToRgb(hex: string, normalize = true) {
  hex = hex.replace("#", "");
  const bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  if (normalize) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
  }
  return [r, g, b];
}
