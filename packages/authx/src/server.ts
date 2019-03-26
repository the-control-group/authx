import Koa from "koa";
import AuthX from ".";
import authXInterface from "authx-interface";

import email from "./strategy/email";
import password from "./strategy/password";

const __DEV__ = process.env.NODE_ENV !== "production";

// create a Koa app
const app = new Koa();
app.proxy = true;

// add the AuthX user interface
app.use(authXInterface);

// create a new instanciate of AuthX
const authx = new AuthX({
  realm: "AuthX",
  interfaceBaseUrl: "http://localhost:3000/",
  strategies: [email, password],
  pg: {
    database: process.env.PGDATABASE || undefined,
    host: process.env.PGHOST || undefined,
    password: process.env.PGPASSWORD || undefined,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
    ssl: process.env.PGSSL === "true" ? true : false,
    user: process.env.PGUSER || undefined
  },
  oauthPrivateKey:
    process.env.OAUTHPRIVATE ||
    `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQCfb+nyTPFCntEXbrFPU5DeE0gC4jXRcSFWDfCRgeqeQWqIW9De
MmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/JyUEVIBMF0upDJMA53AFFx+0Fb
/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gKBac/x5qiUn5fh2xM+wIDAQAB
AoGAeOPGo24r0LPTHs1TrC5Uvc4o3+bdn70D5dgT/IBhgTVgrZvQt2nDVPfgc2aw
e1HzVnnbYteoC3xrea4R4lnzGpgcvLYyJ+LEAeRNT66u12EHnCjl8OM5Ods79RO2
pSaGBiAlntq9E86DBJ9ma9lL9NXiokCx4h1ph9rqr6T+DMECQQD7zM56evJj8JyV
kyu7m3PGpepqgMtO4LjHlkU9ZP2HRfrq+bl4yWps1TyCTPzaRujXW+hHJBPsTYar
TmsLcDepAkEAohi3FmYiAMhppgPMFqIr15tY04dKDw4kPgbaQLXT59v9e16alj+2
hsBvMWA/juLuk/2JRuNutY0WBmtkkS42AwJBAKEjS++txniWfl5qNE53CPxTKVTG
31S3EwkG7YCApI5xBkZhUYQuwWCshXCNfDLjthY7xsXgHK/YXRo7sN09DyECQD2W
0HIFSmQrweCfTrtG0Qux7dUpcV05DVI3/lNaAvL05mIqtufhu3OFyHnlTSD4XpgC
XFd/8L+wpK65vVNgUIsCQFO6/fma+fjXx9kG+/zy4C/VwJWFUcpo5Z3R2TF7FheW
5N6OERXoA+Qu+ew7xS6WrAp33dHncIyr9ekkvGc01FU=
-----END RSA PRIVATE KEY-----`,
  oauthPublicKeys: [
    process.env.OAUTHPUBLIC ||
      `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC
4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy
UEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK
Bac/x5qiUn5fh2xM+wIDAQAB
-----END PUBLIC KEY-----`,
    ...(process.env.OAUTHPUBLIC ? [process.env.OAUTHPUBLIC] : [])
  ],
  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    from?: string;
  }) {
    console.log("--- SENDING EMAIL MESSAGE -------------------------");
    console.log(options);
  }
});

// apply the AuthX routes to the app
app.use(authx.routes());

// log errors - everything as JSON makes a happier you
app.on(
  "error",
  __DEV__
    ? error => {
        console.error(error);
      }
    : error => {
        if (error.status && error.status < 500)
          console.log(
            JSON.stringify(
              Object.assign({ level: "info", message: error.message }, error)
            )
          );
        else
          console.error(
            JSON.stringify(
              Object.assign(
                { level: "error", message: error.message, stack: error.stack },
                error
              )
            )
          );
      }
);

// start listening
app.listen(process.env.PORT || 3000);
