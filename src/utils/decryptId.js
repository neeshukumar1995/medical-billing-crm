// import CryptoJS from "crypto-js";

// const KEY = CryptoJS.enc.Utf8.parse("1234567890123456");
// const IV  = CryptoJS.enc.Utf8.parse("6543210987654321");

// export const decryptId = (encryptedId) => {
//   try {
//     const decoded = decodeURIComponent(encryptedId);

//     const bytes = CryptoJS.AES.decrypt(
//       decoded,
//       KEY,
//       {
//         iv: IV,
//         mode: CryptoJS.mode.CBC,
//         padding: CryptoJS.pad.Pkcs7,
//       }
//     );

//     const originalId = bytes.toString(CryptoJS.enc.Utf8);

//     return originalId || null;
//   } catch (error) {
//     console.error("Decrypt failed", error);
//     return null;
//   }
// };


import CryptoJS from "crypto-js";

const KEY = CryptoJS.enc.Utf8.parse("1234567890123456");

export const decryptId = (encryptedId) => {
  try {
    const decoded = decodeURIComponent(encryptedId);

    const [ivHex, cipherText] = decoded.split(":");

    const IV = CryptoJS.enc.Hex.parse(ivHex);

    const bytes = CryptoJS.AES.decrypt(
      cipherText,
      KEY,
      {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const originalId = bytes.toString(CryptoJS.enc.Utf8);
    return originalId || null;
  } catch (err) {
    console.error("Decrypt failed", err);
    return null;
  }
};

