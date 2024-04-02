import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";

// Check if the keys already exist.
if (existsSync("packages/example/private.pem") && existsSync("packages/example/public.pem")) {
  // eslint-disable-next-line no-undef
  console.log("Keys already exist.");
  // eslint-disable-next-line no-undef
  process.exit(0);
}

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
