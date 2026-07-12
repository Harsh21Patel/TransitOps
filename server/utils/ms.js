// Minimal duration parser supporting the subset of formats used in this
// project's env vars: '15m', '7d', '30d', '900s', '1h'. Avoids pulling in
// the external `ms` package for a single narrow use case.

const UNITS = {
  ms: 1,
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
};

function ms(input) {
  if (typeof input === 'number') return input;
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(String(input).trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}"`);
  }
  const [, value, unit] = match;
  return Number(value) * UNITS[unit.toLowerCase()];
}

module.exports = ms;
