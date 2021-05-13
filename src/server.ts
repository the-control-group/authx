import Koa from "koa";
import AuthX, { StrategyCollection } from "@authx/authx";
import createAuthXInterface from "@authx/interface";

import email from "@authx/strategy-email";
import password from "@authx/strategy-password";
import openid from "@authx/strategy-openid";
import saml from "@authx/strategy-saml";

const __DEV__ = process.env.NODE_ENV !== "production";

(async () => {
  try {
    // Create a Koa app.
    const app = new Koa();
    app.proxy = true;

    // Build the interface middleware.
    const interfaceMiddleware = await createAuthXInterface("authx", [
      "@authx/strategy-email/interface",
      "@authx/strategy-password/interface",
      "@authx/strategy-openid/interface",
      "@authx/strategy-saml/interface",
    ]);

    // Add the AuthX user interface.
    app.use(interfaceMiddleware);

    // Create a new instanciate of AuthX.
    const authx = new AuthX({
      realm: "authx",
      base: `http://localhost${
        process.env.PORT ? `:${process.env.PORT}` : ""
      }/`,
      codeValidityDuration: 60,
      jwtValidityDuration: 5 * 60,
      privateKey:
        process.env.KEYPRIVATE ??
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
      publicKeys: [
        process.env.KEYPUBLIC ??
          `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC
4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy
UEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK
Bac/x5qiUn5fh2xM+wIDAQAB
-----END PUBLIC KEY-----`,
        ...(process.env.KEYPUBLIC2 ? [process.env.KEYPUBLIC2] : []),
      ],
      async sendMail(options: {
        to: string;
        subject: string;
        text: string;
        html: string;
        from?: string;
      }): Promise<void> {
        console.log("--- SENDING EMAIL MESSAGE -------------------------");
        console.log(options);
      },
      strategies: new StrategyCollection([email, password, openid, saml]),
      pg: {
        database: process.env.PGDATABASE ?? undefined,
        host: process.env.PGHOST ?? undefined,
        password: process.env.PGPASSWORD ?? undefined,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
        ssl: process.env.PGSSL === "true" ? true : false,
        user: process.env.PGUSER ?? undefined,
      },
      maxRequestsPerMinute: process.env.MAX_REQUESTS_PER_KEY_PER_MINUTE
        ? parseFloat(process.env.MAX_REQUESTS_PER_KEY_PER_MINUTE)
        : null,
    });

    // Apply the AuthX routes to the app.
    app.use(authx.routes());

    // Log errors - everything as JSON makes a happier you.
    app.on(
      "error",
      __DEV__
        ? (error): void => {
            console.error(error);
          }
        : (error): void => {
            if (error.status && error.status < 500)
              console.log(
                JSON.stringify(
                  Object.assign(
                    { level: "info", message: error.message },
                    error
                  )
                )
              );
            else
              console.error(
                JSON.stringify(
                  Object.assign(
                    {
                      level: "error",
                      message: error.message,
                      stack: error.stack,
                    },
                    error
                  )
                )
              );
          }
    );

    // Start listening.
    app.listen(process.env.PORT || 80);
  } catch (error) {
    console.error(error);
  }
})();
