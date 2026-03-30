const bcrypt = require("bcryptjs");
const SALT_ROUNDS = 12;

const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(plainPassword, salt);
  return hash;
};

const comparePassword = async (plainPassword, storedHash) => {
  return await bcrypt.compare(plainPassword, storedHash);
};

module.exports = { hashPassword, comparePassword };
