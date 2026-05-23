type AllergyFamilyMap = Record<string, string[]>;

const ALLERGY_FAMILY_MAP: AllergyFamilyMap = {
  fish: [
    "fish", "cod", "tilapia", "salmon", "tuna", "trout", "haddock", "halibut", "anchovy", "sardine",
    "snapper", "mahi mahi", "pollock", "catfish", "bass", "herring", "sole",
  ],
  seafood: [
    "fish", "cod", "tilapia", "salmon", "tuna", "trout", "haddock", "halibut", "anchovy", "sardine",
    "snapper", "mahi mahi", "pollock", "catfish", "bass", "herring", "sole",
    "shellfish", "shrimp", "prawn", "crab", "lobster", "crayfish", "crawfish", "scallop", "mussel", "clam", "oyster", "squid", "octopus",
  ],
  shellfish: [
    "shellfish", "shrimp", "prawn", "crab", "lobster", "crayfish", "crawfish", "scallop", "mussel", "clam", "oyster", "squid", "octopus",
  ],
  nut: [
    "nuts", "tree nut", "tree nuts", "almond", "walnut", "pecan", "pistachio", "cashew", "hazelnut",
    "macadamia", "brazil nut", "pine nut", "chestnut",
  ],
  nuts: [
    "nut", "tree nut", "tree nuts", "almond", "walnut", "pecan", "pistachio", "cashew", "hazelnut",
    "macadamia", "brazil nut", "pine nut", "chestnut",
  ],
  "tree nut": [
    "nut", "nuts", "tree nuts", "almond", "walnut", "pecan", "pistachio", "cashew", "hazelnut",
    "macadamia", "brazil nut", "pine nut", "chestnut",
  ],
  "tree nuts": [
    "nut", "nuts", "tree nut", "almond", "walnut", "pecan", "pistachio", "cashew", "hazelnut",
    "macadamia", "brazil nut", "pine nut", "chestnut",
  ],
  peanut: ["peanut", "peanuts", "groundnut", "groundnuts", "peanut butter"],
  peanuts: ["peanut", "groundnut", "groundnuts", "peanut butter"],
  dairy: [
    "dairy", "milk", "cream", "cheese", "butter", "yogurt", "ghee", "whey", "casein", "lactose", "buttermilk",
    "creme fraiche", "sour cream",
  ],
  milk: [
    "milk", "cream", "cheese", "butter", "yogurt", "ghee", "whey", "casein", "lactose", "buttermilk",
    "creme fraiche", "sour cream",
  ],
  egg: ["egg", "eggs", "albumin", "mayonnaise", "mayo"],
  eggs: ["egg", "albumin", "mayonnaise", "mayo"],
  soy: ["soy", "soybean", "soybeans", "tofu", "edamame", "miso", "tempeh", "tamari"],
  sesame: ["sesame", "tahini", "benne"],
  wheat: ["wheat", "flour", "semolina", "durum", "farina", "bulgur", "couscous", "seitan", "spelt", "triticale"],
  gluten: ["gluten", "wheat", "barley", "rye", "malt", "semolina", "durum", "farina", "bulgur", "couscous", "seitan", "spelt", "triticale"],
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const withSimpleVariants = (term: string): string[] => {
  const normalized = normalizeText(term);
  if (!normalized) return [];
  const variants = new Set<string>([normalized]);

  if (!normalized.endsWith("s")) {
    variants.add(`${normalized}s`);
  } else if (normalized.length > 1) {
    variants.add(normalized.slice(0, -1));
  }

  if (normalized.endsWith("y") && normalized.length > 1) {
    variants.add(`${normalized.slice(0, -1)}ies`);
  }

  return Array.from(variants);
};

const resolveCandidateTerms = (allergy: string): string[] => {
  const normalizedAllergy = normalizeText(allergy);
  if (!normalizedAllergy) return [];

  const candidates = new Set<string>(withSimpleVariants(normalizedAllergy));

  for (const [family, relatedTerms] of Object.entries(ALLERGY_FAMILY_MAP)) {
    const normalizedFamily = normalizeText(family);
    if (
      normalizedAllergy === normalizedFamily ||
      normalizedAllergy.includes(normalizedFamily) ||
      normalizedFamily.includes(normalizedAllergy)
    ) {
      for (const relatedTerm of relatedTerms) {
        for (const variant of withSimpleVariants(relatedTerm)) {
          candidates.add(variant);
        }
      }
    }
  }

  return Array.from(candidates);
};

const textContainsTerm = (normalizedHaystack: string, haystackWords: Set<string>, candidate: string): boolean => {
  if (!candidate) return false;
  if (candidate.includes(" ")) {
    return (` ${normalizedHaystack} `).includes(` ${candidate} `);
  }
  return haystackWords.has(candidate);
};

export const getAllergyMatches = (
  ingredientNames: string[],
  allergies: string[],
  extraText: string[] = []
): string[] => {
  if (!allergies.length) return [];

  const normalizedHaystack = normalizeText([...ingredientNames, ...extraText].filter(Boolean).join(" "));
  if (!normalizedHaystack) return [];

  const haystackWords = new Set(normalizedHaystack.split(" ").filter(Boolean));

  return allergies.filter((allergy) => {
    const terms = resolveCandidateTerms(allergy);
    return terms.some((term) => textContainsTerm(normalizedHaystack, haystackWords, term));
  });
};

export const isAllergySafe = (
  ingredientNames: string[],
  allergies: string[],
  extraText: string[] = []
): boolean => getAllergyMatches(ingredientNames, allergies, extraText).length === 0;
