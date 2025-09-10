import { ReactElement } from "react";
interface Props {
    authority: EmailAuthorityFragmentData;
    setAuthorization: (authorization: {
        id: string;
        secret: string;
    }) => void;
}
export declare function EmailAuthority({ authority, setAuthorization, }: Props): ReactElement<Props>;
export interface EmailAuthorityFragmentData {
    __typename: "EmailAuthority";
    id: string;
    name?: null | string;
}
export declare const EmailAuthorityFragment = "\n  fragment EmailAuthorityFragment on EmailAuthority {\n    __typename\n    id\n    name\n  }\n";
export {};
