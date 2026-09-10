/**
 * The 67 elements this quiz covers.
 *
 * `group` is 1-18, or 0 for the f-block (lanthanides/actinides), which sit
 * outside the main grid. `category` drives distractor selection: wrong answers
 * are drawn from the same category first, because "Silver vs Gold" is a real
 * question and "Silver vs Neon" is not.
 */
export type Category =
  | "alkali"
  | "alkaline"
  | "transition"
  | "post-transition"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble"
  | "lanthanide"
  | "actinide";

export interface Element {
  /** Stable key used everywhere: mastery records, save file, React keys. */
  symbol: string;
  name: string;
  /** Atomic number. */
  z: number;
  /** 1-18, or 0 for the f-block. */
  group: number;
  /** 1-7. */
  period: number;
  category: Category;
  /** Shown after a wrong answer and on the results screen. */
  mnemonic?: string;
}

export const elements: Element[] = [
  // Period 1
  { symbol: "H", name: "Hydrogen", z: 1, group: 1, period: 1, category: "nonmetal" },
  { symbol: "He", name: "Helium", z: 2, group: 18, period: 1, category: "noble" },

  // Period 2
  { symbol: "Li", name: "Lithium", z: 3, group: 1, period: 2, category: "alkali" },
  { symbol: "Be", name: "Beryllium", z: 4, group: 2, period: 2, category: "alkaline" },
  { symbol: "B", name: "Boron", z: 5, group: 13, period: 2, category: "metalloid" },
  { symbol: "C", name: "Carbon", z: 6, group: 14, period: 2, category: "nonmetal" },
  { symbol: "N", name: "Nitrogen", z: 7, group: 15, period: 2, category: "nonmetal" },
  { symbol: "O", name: "Oxygen", z: 8, group: 16, period: 2, category: "nonmetal" },
  { symbol: "F", name: "Fluorine", z: 9, group: 17, period: 2, category: "halogen" },
  { symbol: "Ne", name: "Neon", z: 10, group: 18, period: 2, category: "noble" },

  // Period 3
  { symbol: "Na", name: "Sodium", z: 11, group: 1, period: 3, category: "alkali", mnemonic: "salt has no metal" },
  { symbol: "Mg", name: "Magnesium", z: 12, group: 2, period: 3, category: "alkaline" },
  { symbol: "Al", name: "Aluminum", z: 13, group: 13, period: 3, category: "post-transition" },
  { symbol: "Si", name: "Silicon", z: 14, group: 14, period: 3, category: "metalloid" },
  { symbol: "P", name: "Phosphorus", z: 15, group: 15, period: 3, category: "nonmetal" },
  { symbol: "S", name: "Sulfur", z: 16, group: 16, period: 3, category: "nonmetal" },
  { symbol: "Cl", name: "Chlorine", z: 17, group: 17, period: 3, category: "halogen" },
  { symbol: "Ar", name: "Argon", z: 18, group: 18, period: 3, category: "noble" },

  // Period 4
  { symbol: "K", name: "Potassium", z: 19, group: 1, period: 4, category: "alkali", mnemonic: "K is for Kalium, its Latin name" },
  { symbol: "Ca", name: "Calcium", z: 20, group: 2, period: 4, category: "alkaline" },
  { symbol: "Sc", name: "Scandium", z: 21, group: 3, period: 4, category: "transition" },
  { symbol: "Ti", name: "Titanium", z: 22, group: 4, period: 4, category: "transition" },
  { symbol: "V", name: "Vanadium", z: 23, group: 5, period: 4, category: "transition" },
  { symbol: "Cr", name: "Chromium", z: 24, group: 6, period: 4, category: "transition" },
  { symbol: "Mn", name: "Manganese", z: 25, group: 7, period: 4, category: "transition" },
  { symbol: "Fe", name: "Iron", z: 26, group: 8, period: 4, category: "transition", mnemonic: "Fe is for Ferrum, its Latin name" },
  { symbol: "Co", name: "Cobalt", z: 27, group: 9, period: 4, category: "transition" },
  { symbol: "Ni", name: "Nickel", z: 28, group: 10, period: 4, category: "transition" },
  { symbol: "Cu", name: "Copper", z: 29, group: 11, period: 4, category: "transition", mnemonic: "Cu is for Cuprum, its Latin name" },
  { symbol: "Zn", name: "Zinc", z: 30, group: 12, period: 4, category: "transition" },
  { symbol: "Ga", name: "Gallium", z: 31, group: 13, period: 4, category: "post-transition" },
  { symbol: "Ge", name: "Germanium", z: 32, group: 14, period: 4, category: "metalloid" },
  { symbol: "As", name: "Arsenic", z: 33, group: 15, period: 4, category: "metalloid" },
  { symbol: "Se", name: "Selenium", z: 34, group: 16, period: 4, category: "nonmetal" },
  { symbol: "Br", name: "Bromine", z: 35, group: 17, period: 4, category: "halogen" },
  { symbol: "Kr", name: "Krypton", z: 36, group: 18, period: 4, category: "noble" },

  // Period 5
  { symbol: "Rb", name: "Rubidium", z: 37, group: 1, period: 5, category: "alkali" },
  { symbol: "Sr", name: "Strontium", z: 38, group: 2, period: 5, category: "alkaline" },
  { symbol: "Y", name: "Yttrium", z: 39, group: 3, period: 5, category: "transition" },
  { symbol: "Zr", name: "Zirconium", z: 40, group: 4, period: 5, category: "transition" },
  { symbol: "Tc", name: "Technetium", z: 43, group: 7, period: 5, category: "transition" },
  { symbol: "Ru", name: "Ruthenium", z: 44, group: 8, period: 5, category: "transition" },
  { symbol: "Rh", name: "Rhodium", z: 45, group: 9, period: 5, category: "transition" },
  { symbol: "Pd", name: "Palladium", z: 46, group: 10, period: 5, category: "transition" },
  { symbol: "Ag", name: "Silver", z: 47, group: 11, period: 5, category: "transition", mnemonic: "Ag is for Argentum, its Latin name" },
  { symbol: "Cd", name: "Cadmium", z: 48, group: 12, period: 5, category: "transition" },
  { symbol: "Sn", name: "Tin", z: 50, group: 14, period: 5, category: "post-transition", mnemonic: "Sn is for Stannum, its Latin name" },
  { symbol: "Sb", name: "Antimony", z: 51, group: 15, period: 5, category: "metalloid", mnemonic: "Sb is for Stibium, its Latin name" },
  { symbol: "Te", name: "Tellurium", z: 52, group: 16, period: 5, category: "metalloid" },
  { symbol: "I", name: "Iodine", z: 53, group: 17, period: 5, category: "halogen" },
  { symbol: "Xe", name: "Xenon", z: 54, group: 18, period: 5, category: "noble" },

  // Period 6
  { symbol: "Cs", name: "Caesium", z: 55, group: 1, period: 6, category: "alkali" },
  { symbol: "Ba", name: "Barium", z: 56, group: 2, period: 6, category: "alkaline" },
  { symbol: "La", name: "Lanthanum", z: 57, group: 0, period: 6, category: "lanthanide" },
  { symbol: "Nd", name: "Neodymium", z: 60, group: 0, period: 6, category: "lanthanide" },
  { symbol: "W", name: "Tungsten", z: 74, group: 6, period: 6, category: "transition", mnemonic: "W is for Wolfram, its German name" },
  { symbol: "Au", name: "Gold", z: 79, group: 11, period: 6, category: "transition", mnemonic: "Au is for Aurum, its Latin name" },
  { symbol: "Hg", name: "Mercury", z: 80, group: 12, period: 6, category: "transition", mnemonic: "Freddy Mercury" },
  { symbol: "Tl", name: "Thallium", z: 81, group: 13, period: 6, category: "post-transition" },
  { symbol: "Pb", name: "Lead", z: 82, group: 14, period: 6, category: "post-transition", mnemonic: "Pb is for Plumbum, its Latin name" },
  { symbol: "Bi", name: "Bismuth", z: 83, group: 15, period: 6, category: "post-transition" },
  { symbol: "Po", name: "Polonium", z: 84, group: 16, period: 6, category: "post-transition" },
  { symbol: "Rn", name: "Radon", z: 86, group: 18, period: 6, category: "noble" },

  // Period 7
  { symbol: "Fr", name: "Francium", z: 87, group: 1, period: 7, category: "alkali" },
  { symbol: "Ra", name: "Radium", z: 88, group: 2, period: 7, category: "alkaline" },
  { symbol: "Ac", name: "Actinium", z: 89, group: 0, period: 7, category: "actinide" },
  { symbol: "U", name: "Uranium", z: 92, group: 0, period: 7, category: "actinide" },
];

const bySymbol = new Map(elements.map((e) => [e.symbol, e]));

export function elementBySymbol(symbol: string): Element | undefined {
  return bySymbol.get(symbol);
}

/** Human label for a category, used on the progress screen. */
export const CATEGORY_LABEL: Record<Category, string> = {
  alkali: "Alkali metal",
  alkaline: "Alkaline earth",
  transition: "Transition metal",
  "post-transition": "Post-transition metal",
  metalloid: "Metalloid",
  nonmetal: "Nonmetal",
  halogen: "Halogen",
  noble: "Noble gas",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
};
