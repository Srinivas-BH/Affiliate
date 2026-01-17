/**
 * Advanced NLP Parser - "GenAI Style" Logic
 * Aggressively detects prices, ranges, categories, and platforms from human input.
 */

// --- 1. KNOWLEDGE BASE (The "Brain") ---
const TRAINING_DATASET = {
  // Maps user words to database categories - EXTENSIVELY TRAINED
  categoryMappings: {
    // ===== ELECTRONICS =====
    "laptop": "Laptops", "notebook": "Laptops", "macbook": "Laptops", "gaming laptop": "Laptops", "pc": "Laptops",
    "mobile": "Mobile Phones", "phone": "Mobile Phones", "smartphone": "Mobile Phones", "iphone": "Mobile Phones", "android": "Mobile Phones", "samsung": "Mobile Phones",
    "tv": "Televisions", "television": "Televisions", "led": "Televisions", "smart tv": "Televisions", "4k": "Televisions",
    "watch": "Wearables", "smartwatch": "Wearables", "band": "Wearables", "apple watch": "Wearables", "tracker": "Wearables",
    "headphone": "Audio", "earphone": "Audio", "buds": "Audio", "airpods": "Audio", "speaker": "Audio", "soundbar": "Audio", "headset": "Audio",
    "camera": "Cameras", "dslr": "Cameras", "mirrorless": "Cameras", "gopro": "Cameras",
    "tablet": "Tablets", "ipad": "Tablets", "tab": "Tablets",
    
    // ===== FASHION =====
    "shoe": "Fashion", "sneaker": "Fashion", "boot": "Fashion", "running shoes": "Fashion", "footwear": "Fashion",
    "shirt": "Fashion", "t-shirt": "Fashion", "top": "Fashion", "jeans": "Fashion", "trousers": "Fashion", "pant": "Fashion",
    "dress": "Fashion", "saree": "Fashion", "kurti": "Fashion", "lehenga": "Fashion", "jacket": "Fashion", "hoodie": "Fashion",
    "bag": "Fashion", "backpack": "Fashion", "purse": "Fashion", "wallet": "Fashion", "luggage": "Fashion",

    // ===== HOME =====
    "fridge": "Home Appliances", "refrigerator": "Home Appliances",
    "washing machine": "Home Appliances", "washer": "Home Appliances",
    "ac": "Home Appliances", "air conditioner": "Home Appliances", "cooler": "Home Appliances",
    "microwave": "Home Appliances", "oven": "Home Appliances", "mixer": "Home Appliances", "fan": "Home Appliances"
  },
  
  // Platform aliases
  platforms: {
    "amazon": "AMAZON", "amzn": "AMAZON",
    "flipkart": "FLIPKART", "fk": "FLIPKART",
    "myntra": "MYNTRA",
    "meesho": "MEESHO",
    "ajio": "AJIO"
  },

  // Words to ignore to reduce noise
  stopWords: [
    "i", "im", "am", "looking", "for", "want", "need", "search", "find", "show", "me", "a", "an", "the",
    "is", "are", "with", "in", "on", "at", "to", "from", "budget", "price", "range", "cost", "around",
    "under", "below", "above", "over", "between", "rs", "rupees", "inr", "best", "good", "suggest", "buy", "purchase", 
    "cheap", "expensive", "new", "latest"
  ]
};

// --- 2. INTELLIGENT PARSER LOGIC ---

/**
 * Converts "50k", "1.5L", "Rs 50,000" to clean integers
 */
const standardizePrice = (raw) => {
  if (!raw) return null;
  const lower = raw.toString().toLowerCase().replace(/,/g, "").replace(/\s/g, ""); // Remove commas & spaces
  
  let multiplier = 1;
  if (lower.includes("k")) multiplier = 1000;
  if (lower.includes("l") || lower.includes("lac")) multiplier = 100000;
  if (lower.includes("m") || lower.includes("million")) multiplier = 1000000;

  // Remove non-numeric chars (except dots)
  const numStr = lower.replace(/[^0-9.]/g, "");
  const num = parseFloat(numStr);

  if (isNaN(num)) return null;
  return Math.floor(num * multiplier);
};

const parseNLPQuery = (query) => {
  const parsed = {
    category: null,
    tags: [],
    maxPrice: null,
    minPrice: 0,
    platforms: [],
    originalQuery: query
  };

  const lowerQuery = query.toLowerCase();

  // ------------------------------------------
  // A. PRICE DETECTION ENGINE (Aggressive)
  // ------------------------------------------
  
  // 1. Identify "Max Limit" explicitly (Context: "under", "budget", "max")
  const maxPatterns = [
    /(?:under|below|less than|max|upto|within|budget|cost)\s*(?:of|is)?\s*(?:rs\.?|₹|inr)?\s*(\d+(?:[\.,]\d+)?[kl]?)/i,
    /(?:rs\.?|₹|inr)\s*(\d+(?:[\.,]\d+)?[kl]?)\s*(?:max|limit|only)/i 
  ];

  // 2. Identify "Min Limit" explicitly (Context: "above", "starting")
  const minPatterns = [
    /(?:above|more than|greater than|min|at least|starting|from)\s*(?:from|at)?\s*(?:rs\.?|₹|inr)?\s*(\d+(?:[\.,]\d+)?[kl]?)/i
  ];

  // Apply Max Patterns
  for (const pattern of maxPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      parsed.maxPrice = standardizePrice(match[1]);
      break; 
    }
  }

  // Apply Min Patterns
  for (const pattern of minPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      parsed.minPrice = standardizePrice(match[1]);
      break; 
    }
  }

  // 3. Identify Ranges ("50k to 80k", "50000-80000")
  if (!parsed.maxPrice) {
    const rangeRegex = /(\d+(?:[\.,]\d+)?[kl]?)\s*(?:to|-|and)\s*(\d+(?:[\.,]\d+)?[kl]?)/i;
    const rangeMatch = lowerQuery.match(rangeRegex);
    if (rangeMatch) {
      const p1 = standardizePrice(rangeMatch[1]);
      const p2 = standardizePrice(rangeMatch[2]);
      if (p1 && p2) {
        parsed.minPrice = Math.min(p1, p2);
        parsed.maxPrice = Math.max(p1, p2);
      }
    }
  }

  // 4. FALLBACK: "Smart Inference" (If user just types "laptop 50000")
  if (!parsed.maxPrice && !parsed.minPrice) {
    // Regex matches ANY standalone number that looks like a price (with optional k/l)
    // We strictly exclude numbers followed by technical units (gb, mb, hz, etc.)
    const looseNumberRegex = /\b(\d+(?:[\.,]\d+)?[kl]?)\b(?!\s*(?:gb|mb|tb|mah|mp|hz|v|w|fps|inch))/gi;
    const potentialPrices = [];
    
    let match;
    while ((match = looseNumberRegex.exec(lowerQuery)) !== null) {
      const val = standardizePrice(match[1]);
      // Filter logic: Prices are usually > 500 (avoids model numbers like 'iphone 14')
      // Exception: If it explicitly has 'k' (e.g. 5k), allow it even if small number
      if (val && (val > 500 || match[1].includes('k') || match[1].includes('l'))) {
        potentialPrices.push(val);
      }
    }

    if (potentialPrices.length > 0) {
      if (potentialPrices.length === 1) {
        // Single price found -> Assume it's the Budget (Max Price)
        parsed.maxPrice = potentialPrices[0];
      } else {
        // Multiple prices found -> Assume it's a range
        parsed.minPrice = Math.min(...potentialPrices);
        parsed.maxPrice = Math.max(...potentialPrices);
      }
    }
  }

  // ------------------------------------------
  // B. CATEGORY & PLATFORM DETECTION
  // ------------------------------------------

  // Detect Categories
  for (const [word, category] of Object.entries(TRAINING_DATASET.categoryMappings)) {
    if (lowerQuery.includes(word)) {
      parsed.category = category;
      parsed.tags.push(word); 
      break; 
    }
  }

  // Detect Platforms
  for (const [word, platform] of Object.entries(TRAINING_DATASET.platforms)) {
    if (lowerQuery.includes(word)) {
      parsed.platforms.push(platform);
    }
  }

  // ------------------------------------------
  // C. TECH SPECS & CLEANUP
  // ------------------------------------------

  // Capture specs like "16gb", "1tb", "5000mah" (Critical for matching)
  const specRegex = /(\d+\s*(?:gb|tb|mb|mah|mp|hz|ssd|hdd))\b/gi;
  const specs = query.match(specRegex);
  if (specs) {
    specs.forEach(s => parsed.tags.push(s.toLowerCase().replace(/\s/g, "")));
  }

  // Add remaining useful words as tags
  const cleanWords = lowerQuery.replace(/[^\w\s]/g, "").split(/\s+/);
  cleanWords.forEach(w => {
    if (!TRAINING_DATASET.stopWords.includes(w) && 
        !parsed.tags.includes(w) && 
        isNaN(w) && 
        w.length > 2) { 
      parsed.tags.push(w);
    }
  });

  return parsed;
};

module.exports = { parseNLPQuery };