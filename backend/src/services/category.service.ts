/* =======================================================
   🎯 CATEGORY VECTORS — PRODUCTION VERSION
======================================================= */

const VECTOR_SIZE = 384

function generateBaseVector(seed: number) {
  const vector = Array(VECTOR_SIZE).fill(0)
  vector[seed % VECTOR_SIZE] = 1
  return vector
}

/* 
   IMPORTANT:
   - "For You" is algorithmic → not used for seeding
   - All others are valid preference categories
*/

export const categoryVectors: Record<string, number[]> = {
  World: generateBaseVector(10),
  Politics: generateBaseVector(25),
  Business: generateBaseVector(50),
  Stocks: generateBaseVector(75),
  Crypto: generateBaseVector(100),
  Sports: generateBaseVector(125),
  Entertainment: generateBaseVector(150),
  Technology: generateBaseVector(175),
  Health: generateBaseVector(200),
  General: generateBaseVector(225)
}

/* =======================================================
   🧠 SEED USER VECTOR
======================================================= */

export function seedUserVector(categories: string[]) {
  const selectedVectors = categories
    .filter(cat => cat !== "For You")
    .map(cat => categoryVectors[cat])
    .filter(Boolean)

  if (!selectedVectors.length) {
    return Array(VECTOR_SIZE).fill(0)
  }

  const combined = Array(VECTOR_SIZE).fill(0)

  for (const vec of selectedVectors) {
    for (let i = 0; i < VECTOR_SIZE; i++) {
      combined[i] += vec[i]
    }
  }

  // Normalize
  const norm = Math.sqrt(
    combined.reduce((sum, val) => sum + val * val, 0)
  )

  return norm > 0
    ? combined.map(val => val / norm)
    : combined
}