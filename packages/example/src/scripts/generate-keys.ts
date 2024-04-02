import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";

// Generate a new RSA key pair.
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
    cipher: "aes-256-cbc",
    passphrase: "top secret",
  },
});

// Save the private key to the file system.
writeFileSync("private.pem", privateKey);

// Save the public key to the file system.
writeFileSync("public.pem", publicKey);
