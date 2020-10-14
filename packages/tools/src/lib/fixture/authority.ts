import { ClientBase } from "pg";
import { EmailAuthority } from "@authx/strategy-email";
import { PasswordAuthority } from "@authx/strategy-password";

export const authorityIds = [
  "0d765613-e813-40e5-9aa7-89f96531364e",
  "725f9c3b-4a72-4021-9066-c89e534df5be",
];

export const authority: {
  id: string;
  insert: (tx: ClientBase) => Promise<EmailAuthority | PasswordAuthority>;
}[] = [
  {
    id: "0d765613-e813-40e5-9aa7-89f96531364e",
    insert: (tx: ClientBase): Promise<EmailAuthority> =>
      EmailAuthority.write(
        tx,
        {
          id: "0d765613-e813-40e5-9aa7-89f96531364e",
          enabled: true,
          name: "Email",
          description: "The email authority.",
          strategy: "email",
          details: {
            privateKey: `-----BEGIN RSA PRIVATE KEY-----
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
              `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfb+nyTPFCntEXbrFPU5DeE0gC
4jXRcSFWDfCRgeqeQWqIW9DeMmCj13k0z6fQCiG3FATYosS64wAs+OiyGtu9q/Jy
UEVIBMF0upDJMA53AFFx+0Fb/i76JFPTY7SxzvioIFeKRwY8evIRWQWYO95Os6gK
Bac/x5qiUn5fh2xM+wIDAQAB
-----END PUBLIC KEY-----`,
            ],
            proofValidityDuration: 3600,
            authenticationEmailSubject: "Reset your password",
            authenticationEmailText:
              "Please visit the following link to authenticate with this email address:\n\n{{{url}}}",
            authenticationEmailHtml:
              'Please <a href="{{url}}">follow this link</a> to authenticate with this email address.',
            verificationEmailSubject: "Verify your email",
            verificationEmailText:
              "Please visit the following link to prove your control of this email address:\n\n{{{url}}}",
            verificationEmailHtml:
              'Please <a href="{{url}}">follow this link</a> to prove your control of this email address.',
          },
        },
        {
          recordId: "84168393-0277-4ba2-b3bd-5ad837fe7cf5",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        }
      ),
  },
  {
    id: "725f9c3b-4a72-4021-9066-c89e534df5be",
    insert: (tx: ClientBase): Promise<PasswordAuthority> =>
      PasswordAuthority.write(
        tx,
        {
          id: "725f9c3b-4a72-4021-9066-c89e534df5be",
          enabled: true,
          name: "Password",
          description: "The password authority.",
          strategy: "password",
          details: {
            rounds: 4,
          },
        },
        {
          recordId: "dc4f3328-34da-4c46-94a8-2ec041d495e3",
          createdByAuthorizationId: "f0e54748-c7bb-4724-ad8b-7dabb66aafa9",
          createdAt: new Date("2019-03-06T21:07:59.814Z"),
        }
      ),
  },
];
