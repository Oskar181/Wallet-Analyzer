function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function validateAddresses(addresses) {
  if (!Array.isArray(addresses)) {
    return { valid: [], invalid: [] };
  }

  const valid = [];
  const invalid = [];

  addresses.forEach(address => {
    const trimmed = address?.toString().trim();
    if (!trimmed) return;

    if (isValidEthereumAddress(trimmed)) {
      valid.push(trimmed.toLowerCase());
    } else {
      invalid.push(trimmed);
    }
  });

  return { 
    valid: [...new Set(valid)], // Remove duplicates
    invalid: [...new Set(invalid)]
  };
}

function parseAddressInput(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }
  
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(addr => addr.toLowerCase());
}

module.exports = {
  sleep,
  isValidEthereumAddress,
  validateAddresses,
  parseAddressInput
};
