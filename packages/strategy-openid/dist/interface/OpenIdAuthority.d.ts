import { ReactElement } from "react";
interface Props {
    authority: OpenIdAuthorityFragmentData;
    setAuthorization: (authorization: {
        id: string;
        secret: string;
    }) => void;
}
export declare function OpenIdAuthority({ authority, setAuthorization, }: Props): ReactElement<Props>;
export interface OpenIdAuthorityFragmentData {
    __typename: "OpenIdAuthority";
    id: string;
    name?: null | string;
    authUrl: string;
    clientId: string;
}
export declare const OpenIdAuthorityFragment = "\n  fragment OpenIdAuthorityFragment on OpenIdAuthority {\n    __typename\n    id\n    name\n    authUrl\n    clientId\n  }\n";
export {};
