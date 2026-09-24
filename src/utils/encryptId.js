// import CryptoJS from "crypto-js";

// const KEY = CryptoJS.enc.Utf8.parse("1234567890123456"); // 16 bytes
// const IV  = CryptoJS.enc.Utf8.parse("6543210987654321"); // 16 bytes

// export const encryptId = (id) => {
//   const encrypted = CryptoJS.AES.encrypt(
//     id.toString(),
//     KEY,
//     {
//       iv: IV,
//       mode: CryptoJS.mode.CBC,
//       padding: CryptoJS.pad.Pkcs7,
//     }
//   );

//   return encodeURIComponent(encrypted.toString());
// };

import CryptoJS from "crypto-js";

// KEY should be FIXED (env / backend / constant)
const KEY = CryptoJS.enc.Utf8.parse("1234567890123456");

export const encryptId = (id) => {
  const IV = CryptoJS.lib.WordArray.random(64);

  const encrypted = CryptoJS.AES.encrypt(
    id.toString(),
    KEY,
    {
      iv: IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  // IV + ciphertext (important)
  const result = IV.toString() + ":" + encrypted.toString();

  return encodeURIComponent(result);
};

export const decryptId = (encryptedId) => {
  try {
    const decoded = decodeURIComponent(encryptedId);
    const [ivString, ciphertext] = decoded.split(':');

    if (!ivString || !ciphertext) {
      throw new Error('Invalid encrypted ID format');
    }

    const IV = CryptoJS.enc.Hex.parse(ivString);

    const decrypted = CryptoJS.AES.decrypt(
      ciphertext,
      KEY,
      {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      throw new Error('Decryption failed');
    }

    return decryptedText;
  } catch (error) {
    console.error('Error decrypting ID:', error);
    return null;
  }
};
