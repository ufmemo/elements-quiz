import { elements } from "./elements";

export function getElementNameBySymbol(symbol: string): string {
  const element = elements.find((e) => e.symbol === symbol);
  return element ? element.name : "";
}

export function getElementBySymbol(symbol: string) {
  return elements.find((e) => e.symbol === symbol);
}
